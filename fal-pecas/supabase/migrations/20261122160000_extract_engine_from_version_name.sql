-- Extrai motor evidenciado em version_name para a coluna engine.
-- Ex.: version "1.4" / "MOTOR 1.3" / "1.6 16V" / "1.4 TFSI".
-- Não inventa motor: só quando há \d.\d no version_name e engine está vazio.
-- Resolve colisão natural (maker+model+year+engine+version) fundindo PVC e inativando duplicata.
-- Compatível com schema sem year_key/engine_key/version_key/updated_at.

do $$
declare
  r record;
  v_engine text;
  v_rest text;
  v_new_version text;
  v_conflict uuid;
  v_num numeric;
  v_has_updated_at boolean;
  v_has_customer_vehicles boolean;
begin
  select exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'vehicle_versions' and column_name = 'updated_at'
  ) into v_has_updated_at;

  select to_regclass('public.customer_vehicles') is not null into v_has_customer_vehicles;

  for r in
    select vv.id, vv.manufacturer_id, vv.model_id, vv.year, vv.version_name
    from public.vehicle_versions vv
    where vv.status = 'active'
      and (vv.engine is null or btrim(vv.engine) = '')
      and vv.version_name is not null
      and vv.version_name ~ '\d+\.\d+'
  loop
    v_engine := (regexp_match(r.version_name, '(\d+\.\d+)'))[1];
    if v_engine is null then
      continue;
    end if;
    v_num := v_engine::numeric;
    if v_num < 0.8 or v_num > 7.0 then
      continue;
    end if;

    v_rest := regexp_replace(r.version_name, '^\s*MOTOR\s+', '', 'i');
    v_rest := regexp_replace(v_rest, v_engine, '', 'i');
    v_rest := regexp_replace(v_rest, '^\s*[-,/]+\s*', '');
    v_rest := trim(both from v_rest);

    if v_rest = '' or v_rest ~* '^(16V|8V|20V|12V)$' then
      v_new_version := null;
    else
      v_new_version := v_rest;
    end if;

    select id into v_conflict
    from public.vehicle_versions
    where manufacturer_id = r.manufacturer_id
      and model_id = r.model_id
      and coalesce(year, -1) = coalesce(r.year, -1)
      and lower(trim(coalesce(engine, ''))) = lower(trim(v_engine))
      and lower(trim(coalesce(version_name, ''))) = lower(trim(coalesce(v_new_version, '')))
      and id <> r.id
      and status = 'active'
    limit 1;

    if v_conflict is not null then
      if to_regclass('public.product_vehicle_compatibility') is not null then
        update public.product_vehicle_compatibility p
        set vehicle_version_id = v_conflict
        where p.vehicle_version_id = r.id
          and not exists (
            select 1 from public.product_vehicle_compatibility x
            where x.vehicle_version_id = v_conflict and x.product_id = p.product_id
          );
        delete from public.product_vehicle_compatibility where vehicle_version_id = r.id;
      end if;

      if v_has_customer_vehicles then
        execute 'update public.customer_vehicles set vehicle_version_id = $1 where vehicle_version_id = $2'
          using v_conflict, r.id;
      end if;

      if v_has_updated_at then
        update public.vehicle_versions
        set status = 'inactive', updated_at = now()
        where id = r.id;
      else
        update public.vehicle_versions
        set status = 'inactive'
        where id = r.id;
      end if;
    else
      if v_has_updated_at then
        update public.vehicle_versions
        set engine = v_engine,
            version_name = v_new_version,
            updated_at = now()
        where id = r.id;
      else
        update public.vehicle_versions
        set engine = v_engine,
            version_name = v_new_version
        where id = r.id;
      end if;
    end if;
  end loop;
end;
$$;
