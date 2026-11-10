-- Remove dependência de unaccent (pode não existir no schema public do host)

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
