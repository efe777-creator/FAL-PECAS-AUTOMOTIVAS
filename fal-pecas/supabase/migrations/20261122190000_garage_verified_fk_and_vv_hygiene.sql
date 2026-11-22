-- Garagem: só FK verified; inativa VV filhas de modelos não aptos.

-- 1) VV active sob modelo inactive/não-verified → inactive
update public.vehicle_versions vv
set status = 'inactive',
    updated_at = now()
from public.models mo
where vv.model_id = mo.id
  and vv.status = 'active'
  and (mo.status <> 'active' or mo.quality_status <> 'verified');

-- 2) RPC create_customer_vehicle_with_identity: sanitiza FKs
create or replace function public.create_customer_vehicle_with_identity(
  p_manufacturer_id uuid default null,
  p_model_id uuid default null,
  p_version_id uuid default null,
  p_year integer default null,
  p_engine text default null,
  p_nickname text default null,
  p_is_primary boolean default false,
  p_maker_text text default null,
  p_model_text text default null,
  p_version_text text default null,
  p_engine_text text default null,
  p_plate text default null,
  p_plate_normalized text default null,
  p_source_snapshot jsonb default null
)
returns public.customer_vehicles
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_customer_id uuid := public.current_customer_id();
  v_identity_id uuid;
  v_row public.customer_vehicles;
  v_maker uuid := p_manufacturer_id;
  v_model uuid := p_model_id;
  v_version uuid := p_version_id;
  v_canon uuid;
begin
  if v_customer_id is null then
    raise exception 'customer not found' using errcode = '42501';
  end if;

  if nullif(trim(coalesce(p_maker_text, '')), '') is null
     or nullif(trim(coalesce(p_model_text, '')), '') is null then
    raise exception 'maker_text and model_text required' using errcode = '22023';
  end if;

  -- Remap superseded → canônico verified
  if v_model is not null then
    select canonical_model_id into v_canon
    from public.models
    where id = v_model and quality_status = 'superseded';
    if v_canon is not null then
      v_model := v_canon;
      v_version := null;
    end if;
  end if;

  -- Só aceita modelo active+verified
  if v_model is not null and not exists (
    select 1 from public.models m
    where m.id = v_model and m.status = 'active' and m.quality_status = 'verified'
  ) then
    v_model := null;
    v_version := null;
  end if;

  -- Maker deve existir active (se informado)
  if v_maker is not null and not exists (
    select 1 from public.manufacturers mk where mk.id = v_maker and mk.status = 'active'
  ) then
    v_maker := null;
  end if;

  -- Se model ok, alinhar maker ao do modelo
  if v_model is not null then
    select manufacturer_id into v_maker from public.models where id = v_model;
  end if;

  -- VV: active + mesmo model + pai verified
  if v_version is not null and not exists (
    select 1
    from public.vehicle_versions vv
    join public.models mo on mo.id = vv.model_id
    where vv.id = v_version
      and vv.status = 'active'
      and vv.model_id = v_model
      and mo.status = 'active'
      and mo.quality_status = 'verified'
  ) then
    v_version := null;
  end if;

  if coalesce(p_is_primary, false) then
    update public.customer_vehicles
    set is_primary = false
    where customer_id = v_customer_id and is_primary = true;
  end if;

  insert into public.vehicle_identities (
    manufacturer_id, model_id, version_id,
    maker_text, model_text, version_text, engine_text, year,
    plate_current, plate_normalized_current,
    created_via
  ) values (
    v_maker, v_model, v_version,
    nullif(trim(p_maker_text), ''), nullif(trim(p_model_text), ''),
    nullif(trim(p_version_text), ''), nullif(trim(coalesce(p_engine_text, p_engine)), ''),
    p_year,
    nullif(trim(p_plate), ''), nullif(trim(p_plate_normalized), ''),
    'garage_save'
  )
  returning id into v_identity_id;

  insert into public.vehicle_ownership_periods (
    vehicle_identity_id, customer_id,
    started_at, started_certainty, started_source,
    registered_at
  ) values (
    v_identity_id, v_customer_id,
    null, 'unknown', null,
    now()
  );

  insert into public.customer_vehicles (
    customer_id, manufacturer_id, model_id, version_id,
    year, engine, nickname, is_primary,
    maker_text, model_text, version_text, engine_text,
    plate, plate_normalized, source_snapshot, vehicle_identity_id
  ) values (
    v_customer_id, v_maker, v_model, v_version,
    p_year, nullif(trim(coalesce(p_engine, '')), ''), nullif(trim(coalesce(p_nickname, '')), ''),
    coalesce(p_is_primary, false),
    nullif(trim(p_maker_text), ''), nullif(trim(p_model_text), ''),
    nullif(trim(p_version_text), ''), nullif(trim(coalesce(p_engine_text, '')), ''),
    nullif(trim(p_plate), ''), nullif(trim(p_plate_normalized), ''),
    p_source_snapshot, v_identity_id
  )
  returning * into v_row;

  return v_row;
end;
$$;

comment on function public.create_customer_vehicle_with_identity is
  'PLANO 2A E1: cria identity + ownership + membership; FKs só verified (sanitiza).';

revoke all on function public.create_customer_vehicle_with_identity from public;
grant execute on function public.create_customer_vehicle_with_identity to authenticated;
