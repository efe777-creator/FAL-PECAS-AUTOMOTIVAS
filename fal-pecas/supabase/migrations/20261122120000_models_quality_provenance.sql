-- Qualidade / proveniência do mestre de modelos (aditivo).
-- Seletor público: status=active AND quality_status=verified.
-- Novos modelos via upsert/apps-import nascem em review (nunca verified por heurística).

alter table public.models
  add column if not exists quality_status text not null default 'review'
    check (quality_status in ('review', 'verified', 'quarantined', 'superseded')),
  add column if not exists canonical_model_id uuid references public.models (id) on delete set null,
  add column if not exists vehicle_class text not null default 'unknown'
    check (vehicle_class in ('car', 'light_utility', 'motorcycle', 'trailer', 'unknown')),
  add column if not exists evidence_kind text,
  add column if not exists evidence_url text,
  add column if not exists review_note text,
  add column if not exists reviewed_at timestamptz,
  add column if not exists reviewed_by uuid;

create index if not exists models_quality_status_idx
  on public.models (quality_status)
  where status = 'active';

create index if not exists models_canonical_model_id_idx
  on public.models (canonical_model_id)
  where canonical_model_id is not null;

comment on column public.models.quality_status is
  'review|verified|quarantined|superseded — loja só expõe verified+active';
comment on column public.models.canonical_model_id is
  'Self-FK quando superseded: aponta para o modelo canônico destino do remap';
comment on column public.models.vehicle_class is
  'car|light_utility|motorcycle|trailer|unknown';

-- ---------------------------------------------------------------------------
-- upsert_vehicle_canonical_internal: novos modelos nascem quality_status=review
-- ---------------------------------------------------------------------------
-- Mantém defaults da assinatura runtime (não remover defaults — PG 42P13).
create or replace function public.upsert_vehicle_canonical_internal(
  p_maker text,
  p_model text,
  p_year integer default null,
  p_engine text default null,
  p_version text default null,
  p_source text default 'plate'
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_maker_in text := trim(both from coalesce(p_maker, ''));
  v_model_in text := trim(both from coalesce(p_model, ''));
  v_engine text := nullif(trim(both from coalesce(p_engine, '')), '');
  v_version text := nullif(trim(both from coalesce(p_version, '')), '');
  v_source text := coalesce(nullif(trim(both from coalesce(p_source, '')), ''), 'admin');
  v_slug_maker text;
  v_slug_model text;
  v_norm_model text;
  v_maker_id uuid;
  v_model_id uuid;
  v_version_id uuid;
  v_out_maker text;
  v_out_model text;
begin
  if v_maker_in = '' or v_model_in = '' then
    raise exception 'maker_and_model_required' using errcode = 'P0001';
  end if;
  if p_year is null or p_year < 1950 or p_year > 2100 then
    raise exception 'year_required_for_canonical_upsert' using errcode = 'P0001';
  end if;
  if v_source not in ('import', 'plate', 'admin') then
    v_source := 'admin';
  end if;

  v_slug_maker := public.slug_from_name(v_maker_in);
  v_slug_model := public.slug_from_name(v_model_in);
  v_norm_model := lower(regexp_replace(v_model_in, '[^a-zA-Z0-9]+', '', 'g'));

  select id, name into v_maker_id, v_out_maker
  from public.manufacturers m
  where lower(trim(m.name)) = lower(v_maker_in)
     or m.slug = v_slug_maker
  limit 1;

  if v_maker_id is null then
    begin
      insert into public.manufacturers (name, slug, status)
      values (v_maker_in, v_slug_maker, 'active')
      returning id, name into v_maker_id, v_out_maker;
    exception
      when unique_violation then
        select id, name into v_maker_id, v_out_maker
        from public.manufacturers
        where slug = v_slug_maker
        limit 1;
        update public.manufacturers set status = 'active' where id = v_maker_id;
    end;
  end if;

  select id, name into v_model_id, v_out_model
  from public.models md
  where md.manufacturer_id = v_maker_id
    and (
      lower(trim(md.name)) = lower(v_model_in)
      or md.slug = v_slug_model
      or lower(regexp_replace(md.name, '[^a-zA-Z0-9]+', '', 'g')) = v_norm_model
    )
  limit 1;

  if v_model_id is null then
    begin
      insert into public.models (
        manufacturer_id, name, slug, status, quality_status, vehicle_class, review_note
      )
      values (
        v_maker_id, v_model_in, v_slug_model, 'active', 'review', 'unknown',
        'Criado via upsert_vehicle_canonical; aguarda evidência A1 ou A2+A2'
      )
      returning id, name into v_model_id, v_out_model;
    exception
      when unique_violation then
        select id, name into v_model_id, v_out_model
        from public.models
        where manufacturer_id = v_maker_id and slug = v_slug_model
        limit 1;
        update public.models
        set status = 'active'
        where id = v_model_id;
    end;
  end if;

  select id into v_version_id
  from public.vehicle_versions
  where manufacturer_id = v_maker_id
    and model_id = v_model_id
    and year_key = coalesce(p_year, -1)
    and engine_key = lower(trim(coalesce(v_engine, '')))
    and version_key = lower(trim(coalesce(v_version, '')))
  limit 1;

  if v_version_id is null then
    insert into public.vehicle_versions (
      manufacturer_id, model_id, year, engine, version_name, status, source, updated_at
    ) values (
      v_maker_id, v_model_id, p_year, v_engine, v_version, 'active', v_source, now()
    )
    returning id into v_version_id;
  else
    update public.vehicle_versions
    set status = 'active',
        updated_at = now(),
        source = case when source = 'admin' and v_source = 'plate' then source else v_source end
    where id = v_version_id;
  end if;

  return jsonb_build_object(
    'manufacturerId', v_maker_id,
    'modelId', v_model_id,
    'versionId', v_version_id,
    'maker', v_out_maker,
    'model', v_out_model,
    'year', case when p_year is null then null else p_year::text end,
    'engine', v_engine,
    'version', v_version
  );
end;
$$;

comment on function public.upsert_vehicle_canonical_internal(text, text, integer, text, text, text) is
  'Writer canônico M/Mo/VV. Novos models nascem quality_status=review (nunca verified automático).';
