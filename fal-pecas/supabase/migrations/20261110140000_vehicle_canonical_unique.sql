-- FAL 028 — chave natural anti-duplicidade em vehicle_versions + upsert canônico

alter table public.vehicle_versions
  add column if not exists source text not null default 'admin'
    check (source in ('import', 'plate', 'admin')),
  add column if not exists updated_at timestamptz not null default now();

alter table public.vehicle_versions
  add column if not exists year_key int
    generated always as (coalesce(year, -1)) stored,
  add column if not exists engine_key text
    generated always as (lower(trim(coalesce(engine, '')))) stored,
  add column if not exists version_key text
    generated always as (lower(trim(coalesce(version_name, '')))) stored;

-- Deduplica VV: remapeia PVC para o registro mais antigo da chave natural
do $$
begin
  update public.product_vehicle_compatibility pvc
  set vehicle_version_id = k.keep_id
  from (
    select
      id as dup_id,
      first_value(id) over (
        partition by manufacturer_id, model_id, year_key, engine_key, version_key
        order by created_at asc nulls last, id asc
      ) as keep_id,
      row_number() over (
        partition by manufacturer_id, model_id, year_key, engine_key, version_key
        order by created_at asc nulls last, id asc
      ) as rn
    from public.vehicle_versions
  ) k
  where pvc.vehicle_version_id = k.dup_id
    and k.rn > 1
    and not exists (
      select 1
      from public.product_vehicle_compatibility x
      where x.product_id = pvc.product_id
        and x.vehicle_version_id = k.keep_id
    );

  delete from public.product_vehicle_compatibility pvc
  using (
    select
      id as dup_id,
      row_number() over (
        partition by manufacturer_id, model_id, year_key, engine_key, version_key
        order by created_at asc nulls last, id asc
      ) as rn
    from public.vehicle_versions
  ) k
  where pvc.vehicle_version_id = k.dup_id
    and k.rn > 1;

  delete from public.vehicle_versions vv
  using (
    select
      id as dup_id,
      row_number() over (
        partition by manufacturer_id, model_id, year_key, engine_key, version_key
        order by created_at asc nulls last, id asc
      ) as rn
    from public.vehicle_versions
  ) k
  where vv.id = k.dup_id
    and k.rn > 1;
end $$;

create unique index if not exists vehicle_versions_natural_uidx
  on public.vehicle_versions (manufacturer_id, model_id, year_key, engine_key, version_key);

comment on column public.vehicle_versions.source is
  'Origem do cadastro: import | plate | admin';

-- Função definida em 20261110143000 (sem unaccent). Placeholder mínimo se só esta migration rodar:
create or replace function public.upsert_vehicle_canonical(
  p_maker text,
  p_model text,
  p_year int default null,
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
  v_maker_in text;
  v_model_in text;
  v_maker_id uuid;
  v_model_id uuid;
  v_version_id uuid;
  v_slug_maker text;
  v_slug_model text;
  v_engine text;
  v_version text;
  v_source text;
  v_norm_maker text;
  v_norm_model text;
  v_out_maker text;
  v_out_model text;
begin
  v_maker_in := nullif(trim(coalesce(p_maker, '')), '');
  v_model_in := nullif(trim(coalesce(p_model, '')), '');
  if v_maker_in is null or v_model_in is null then
    raise exception 'maker_and_model_required';
  end if;

  v_engine := nullif(trim(coalesce(p_engine, '')), '');
  v_version := nullif(trim(coalesce(p_version, '')), '');
  v_source := case
    when p_source in ('import', 'plate', 'admin') then p_source
    else 'plate'
  end;

  v_norm_maker := lower(regexp_replace(v_maker_in, '[^a-zA-Z0-9]+', '', 'g'));
  v_slug_maker := trim(both '-' from lower(regexp_replace(v_maker_in, '[^a-zA-Z0-9]+', '-', 'g')));
  if coalesce(v_slug_maker, '') = '' then
    v_slug_maker := 'maker-' || substr(md5(v_maker_in), 1, 8);
  end if;

  select id, name into v_maker_id, v_out_maker
  from public.manufacturers m
  where lower(trim(m.name)) = lower(v_maker_in)
     or m.slug = v_slug_maker
     or lower(regexp_replace(m.name, '[^a-zA-Z0-9]+', '', 'g')) = v_norm_maker
  limit 1;

  if v_maker_id is null then
    insert into public.manufacturers (name, slug, status)
    values (v_maker_in, v_slug_maker, 'active')
    on conflict (slug) do update set status = 'active'
    returning id, name into v_maker_id, v_out_maker;
  end if;

  v_norm_model := lower(regexp_replace(v_model_in, '[^a-zA-Z0-9]+', '', 'g'));
  v_slug_model := trim(both '-' from lower(regexp_replace(v_model_in, '[^a-zA-Z0-9]+', '-', 'g')));
  if coalesce(v_slug_model, '') = '' then
    v_slug_model := 'model-' || substr(md5(v_model_in), 1, 8);
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
      insert into public.models (manufacturer_id, name, slug, status)
      values (v_maker_id, v_model_in, v_slug_model, 'active')
      returning id, name into v_model_id, v_out_model;
    exception
      when unique_violation then
        select id, name into v_model_id, v_out_model
        from public.models
        where manufacturer_id = v_maker_id and slug = v_slug_model
        limit 1;
        update public.models set status = 'active' where id = v_model_id;
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

revoke all on function public.upsert_vehicle_canonical(text, text, int, text, text, text) from public;
grant execute on function public.upsert_vehicle_canonical(text, text, int, text, text, text) to service_role;
grant execute on function public.upsert_vehicle_canonical(text, text, int, text, text, text) to authenticated;
