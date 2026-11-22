-- Create RPC usa sanitize canônico; trigger impede UPDATE sujo via RLS.

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
  v_maker uuid;
  v_model uuid;
  v_version uuid;
begin
  if v_customer_id is null then
    raise exception 'customer not found' using errcode = '42501';
  end if;

  if nullif(trim(coalesce(p_maker_text, '')), '') is null
     or nullif(trim(coalesce(p_model_text, '')), '') is null then
    raise exception 'maker_text and model_text required' using errcode = '22023';
  end if;

  select s.o_manufacturer_id, s.o_model_id, s.o_version_id
  into v_maker, v_model, v_version
  from public.sanitize_garage_vehicle_fks(p_manufacturer_id, p_model_id, p_version_id) s;

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
  'PLANO 2A E1: identity+ownership+membership; FKs via sanitize_garage_vehicle_fks.';

revoke all on function public.create_customer_vehicle_with_identity from public;
grant execute on function public.create_customer_vehicle_with_identity to authenticated;

-- BEFORE UPDATE: sanitiza FKs mesmo via PostgREST direto (RLS own)
create or replace function public.trg_sanitize_garage_fks()
returns trigger
language plpgsql
set search_path to 'public'
as $$
declare
  v_maker uuid;
  v_model uuid;
  v_version uuid;
begin
  select s.o_manufacturer_id, s.o_model_id, s.o_version_id
  into v_maker, v_model, v_version
  from public.sanitize_garage_vehicle_fks(NEW.manufacturer_id, NEW.model_id, NEW.version_id) s;
  NEW.manufacturer_id := v_maker;
  NEW.model_id := v_model;
  NEW.version_id := v_version;
  return NEW;
end;
$$;

drop trigger if exists customer_vehicles_sanitize_fks on public.customer_vehicles;
create trigger customer_vehicles_sanitize_fks
  before insert or update of manufacturer_id, model_id, version_id
  on public.customer_vehicles
  for each row execute function public.trg_sanitize_garage_fks();

drop trigger if exists vehicle_identities_sanitize_fks on public.vehicle_identities;
create trigger vehicle_identities_sanitize_fks
  before insert or update of manufacturer_id, model_id, version_id
  on public.vehicle_identities
  for each row execute function public.trg_sanitize_garage_fks();
