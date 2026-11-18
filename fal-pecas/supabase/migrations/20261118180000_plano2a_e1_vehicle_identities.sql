-- PLANO 2A / Etapa 1: vehicle_identities + ownership_periods + FK membership + RPC atômica.
-- Decisões: D3/D4/A1 — create atômico; started_at UNKNOWN no backfill; sem workspace/timeline.

-- ---------------------------------------------------------------------------
-- 1) Identidade permanente
-- ---------------------------------------------------------------------------
create table if not exists public.vehicle_identities (
  id uuid primary key default gen_random_uuid(),
  manufacturer_id uuid references public.manufacturers (id) on delete set null,
  model_id uuid references public.models (id) on delete set null,
  version_id uuid references public.vehicle_versions (id) on delete set null,
  maker_text text,
  model_text text,
  version_text text,
  engine_text text,
  year integer,
  vin text,
  chassis text,
  vin_consent_at timestamptz,
  vin_consent_by uuid references auth.users (id) on delete set null,
  plate_current text,
  plate_normalized_current text,
  created_at timestamptz not null default now(),
  created_via text not null default 'garage_save'
    check (created_via in ('garage_save', 'backfill', 'merge')),
  merged_into_id uuid references public.vehicle_identities (id) on delete set null
);

comment on table public.vehicle_identities is
  'PLANO 2A E1: identidade permanente do veículo (não é membership).';

create index if not exists vehicle_identities_plate_norm_idx
  on public.vehicle_identities (plate_normalized_current)
  where plate_normalized_current is not null;

create index if not exists vehicle_identities_merged_idx
  on public.vehicle_identities (merged_into_id)
  where merged_into_id is not null;

-- Display curto derivado (não armazenado): FAL- + 8 hex do uuid
create or replace function public.vehicle_identity_fal_code(p_id uuid)
returns text
language sql
immutable
as $$
  select 'FAL-' || upper(substr(replace(p_id::text, '-', ''), 1, 8));
$$;

grant execute on function public.vehicle_identity_fal_code(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- 2) Períodos de propriedade (started_at nullable = UNKNOWN)
-- ---------------------------------------------------------------------------
create table if not exists public.vehicle_ownership_periods (
  id uuid primary key default gen_random_uuid(),
  vehicle_identity_id uuid not null references public.vehicle_identities (id) on delete cascade,
  customer_id uuid not null references public.customers (id) on delete cascade,
  started_at timestamptz,
  started_certainty text not null default 'unknown'
    check (started_certainty in ('known', 'estimated', 'unknown')),
  started_source text,
  registered_at timestamptz not null default now(),
  ended_at timestamptz,
  ended_reason text
    check (ended_reason is null or ended_reason in ('transfer', 'abandoned', 'admin', 'removed_membership')),
  transfer_id uuid,
  created_at timestamptz not null default now(),
  constraint vop_ended_after_registered check (ended_at is null or ended_at >= registered_at)
);

comment on table public.vehicle_ownership_periods is
  'PLANO 2A E1: ownership temporal. started_at null = aquisição UNKNOWN (≠ registered_at).';

comment on column public.vehicle_ownership_periods.started_at is
  'Início real da propriedade; null = desconhecido. Nunca confundir com registered_at.';

comment on column public.vehicle_ownership_periods.registered_at is
  'Momento em que o período foi registrado na FAL (≠ aquisição).';

create index if not exists vop_identity_idx
  on public.vehicle_ownership_periods (vehicle_identity_id, registered_at desc);

create index if not exists vop_customer_idx
  on public.vehicle_ownership_periods (customer_id, registered_at desc);

-- No máximo um período aberto por identity
create unique index if not exists vop_one_open_per_identity_uidx
  on public.vehicle_ownership_periods (vehicle_identity_id)
  where ended_at is null;

-- ---------------------------------------------------------------------------
-- 3) Membership → identity FK
-- ---------------------------------------------------------------------------
alter table public.customer_vehicles
  add column if not exists vehicle_identity_id uuid
    references public.vehicle_identities (id) on delete set null;

create index if not exists customer_vehicles_identity_idx
  on public.customer_vehicles (vehicle_identity_id)
  where vehicle_identity_id is not null;

comment on column public.customer_vehicles.vehicle_identity_id is
  'PLANO 2A E1: membership slot → identidade permanente.';

-- ---------------------------------------------------------------------------
-- 4) Backfill 1:1 (started_at NULL / certainty unknown; registered_at = created_at legado)
-- ---------------------------------------------------------------------------
do $$
declare
  r record;
  v_identity_id uuid;
begin
  for r in
    select
      cv.id,
      cv.customer_id,
      cv.manufacturer_id,
      cv.model_id,
      cv.version_id,
      cv.maker_text,
      cv.model_text,
      cv.version_text,
      cv.engine_text,
      cv.year,
      cv.plate,
      cv.plate_normalized,
      cv.created_at
    from public.customer_vehicles cv
    where cv.vehicle_identity_id is null
  loop
    insert into public.vehicle_identities (
      manufacturer_id, model_id, version_id,
      maker_text, model_text, version_text, engine_text, year,
      plate_current, plate_normalized_current,
      created_at, created_via
    ) values (
      r.manufacturer_id, r.model_id, r.version_id,
      r.maker_text, r.model_text, r.version_text, r.engine_text, r.year,
      r.plate, r.plate_normalized,
      coalesce(r.created_at, now()), 'backfill'
    )
    returning id into v_identity_id;

    insert into public.vehicle_ownership_periods (
      vehicle_identity_id, customer_id,
      started_at, started_certainty, started_source,
      registered_at
    ) values (
      v_identity_id, r.customer_id,
      null, 'unknown', 'backfill',
      coalesce(r.created_at, now())
    );

    update public.customer_vehicles
    set vehicle_identity_id = v_identity_id
    where id = r.id;
  end loop;
end $$;

-- ---------------------------------------------------------------------------
-- 5) RLS
-- ---------------------------------------------------------------------------
alter table public.vehicle_identities enable row level security;
alter table public.vehicle_ownership_periods enable row level security;

-- Identity: visível se o customer tem (ou teve) ownership, ou membership, ou é staff
drop policy if exists vehicle_identities_select_related on public.vehicle_identities;
create policy vehicle_identities_select_related on public.vehicle_identities
  for select to authenticated
  using (
    public.is_staff()
    or exists (
      select 1 from public.vehicle_ownership_periods p
      where p.vehicle_identity_id = vehicle_identities.id
        and p.customer_id = public.current_customer_id()
    )
    or exists (
      select 1 from public.customer_vehicles cv
      where cv.vehicle_identity_id = vehicle_identities.id
        and cv.customer_id = public.current_customer_id()
    )
  );

-- Update attrs identity: só owner vigente (período aberto) ou staff
drop policy if exists vehicle_identities_update_owner on public.vehicle_identities;
create policy vehicle_identities_update_owner on public.vehicle_identities
  for update to authenticated
  using (
    public.is_staff()
    or exists (
      select 1 from public.vehicle_ownership_periods p
      where p.vehicle_identity_id = vehicle_identities.id
        and p.customer_id = public.current_customer_id()
        and p.ended_at is null
    )
  )
  with check (
    public.is_staff()
    or exists (
      select 1 from public.vehicle_ownership_periods p
      where p.vehicle_identity_id = vehicle_identities.id
        and p.customer_id = public.current_customer_id()
        and p.ended_at is null
    )
  );

-- Insert identity: via RPC security definer (revoga insert direto authenticated)
revoke all on public.vehicle_identities from public;
grant select on public.vehicle_identities to authenticated;
-- update permitido via policy acima
grant update (
  manufacturer_id, model_id, version_id,
  maker_text, model_text, version_text, engine_text, year,
  vin, chassis, vin_consent_at, vin_consent_by,
  plate_current, plate_normalized_current
) on public.vehicle_identities to authenticated;

drop policy if exists vop_select_own on public.vehicle_ownership_periods;
create policy vop_select_own on public.vehicle_ownership_periods
  for select to authenticated
  using (
    public.is_staff()
    or customer_id = public.current_customer_id()
  );

revoke all on public.vehicle_ownership_periods from public;
grant select on public.vehicle_ownership_periods to authenticated;

-- ---------------------------------------------------------------------------
-- 6) RPC atômica: criar membership + identity + período
-- ---------------------------------------------------------------------------
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
begin
  if v_customer_id is null then
    raise exception 'customer not found' using errcode = '42501';
  end if;

  if nullif(trim(coalesce(p_maker_text, '')), '') is null
     or nullif(trim(coalesce(p_model_text, '')), '') is null then
    raise exception 'maker_text and model_text required' using errcode = '22023';
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
    p_manufacturer_id, p_model_id, p_version_id,
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
    v_customer_id, p_manufacturer_id, p_model_id, p_version_id,
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
  'PLANO 2A E1: cria identity + ownership (UNKNOWN) + membership atomicamente.';

revoke all on function public.create_customer_vehicle_with_identity from public;
grant execute on function public.create_customer_vehicle_with_identity to authenticated;

-- ---------------------------------------------------------------------------
-- 7) Base transferência (primitives Etapa 1 — sem wizard)
-- Fecha período aberto do caller e abre novo para destinatário + membership mínima.
-- ---------------------------------------------------------------------------
create or replace function public.transfer_vehicle_ownership_base(
  p_vehicle_identity_id uuid,
  p_new_customer_id uuid,
  p_create_membership boolean default true
)
returns uuid
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_caller uuid := public.current_customer_id();
  v_open_id uuid;
  v_new_period_id uuid;
  v_identity public.vehicle_identities%rowtype;
begin
  if v_caller is null then
    raise exception 'customer not found' using errcode = '42501';
  end if;

  if p_new_customer_id is null or p_new_customer_id = v_caller then
    raise exception 'invalid new customer' using errcode = '22023';
  end if;

  select * into v_identity
  from public.vehicle_identities
  where id = p_vehicle_identity_id and merged_into_id is null
  for update;

  if not found then
    raise exception 'identity not found' using errcode = 'P0002';
  end if;

  select id into v_open_id
  from public.vehicle_ownership_periods
  where vehicle_identity_id = p_vehicle_identity_id
    and customer_id = v_caller
    and ended_at is null
  for update;

  if v_open_id is null then
    raise exception 'caller is not current owner' using errcode = '42501';
  end if;

  -- Concorrência: se já existe outro aberto (não deveria), falha
  if exists (
    select 1 from public.vehicle_ownership_periods
    where vehicle_identity_id = p_vehicle_identity_id
      and ended_at is null
      and id <> v_open_id
  ) then
    raise exception 'concurrent open ownership' using errcode = '40001';
  end if;

  update public.vehicle_ownership_periods
  set ended_at = now(), ended_reason = 'transfer'
  where id = v_open_id;

  insert into public.vehicle_ownership_periods (
    vehicle_identity_id, customer_id,
    started_at, started_certainty, registered_at
  ) values (
    p_vehicle_identity_id, p_new_customer_id,
    null, 'unknown', now()
  )
  returning id into v_new_period_id;

  if coalesce(p_create_membership, true) then
    insert into public.customer_vehicles (
      customer_id, manufacturer_id, model_id, version_id,
      year, engine, maker_text, model_text, version_text, engine_text,
      plate, plate_normalized, vehicle_identity_id, is_primary
    )
    select
      p_new_customer_id,
      v_identity.manufacturer_id, v_identity.model_id, v_identity.version_id,
      v_identity.year, v_identity.engine_text,
      v_identity.maker_text, v_identity.model_text, v_identity.version_text, v_identity.engine_text,
      v_identity.plate_current, v_identity.plate_normalized_current,
      p_vehicle_identity_id, false
    where not exists (
      select 1 from public.customer_vehicles cv
      where cv.customer_id = p_new_customer_id
        and cv.vehicle_identity_id = p_vehicle_identity_id
    );
  end if;

  return v_new_period_id;
end;
$$;

comment on function public.transfer_vehicle_ownership_base is
  'PLANO 2A E1: base segura de transferência (sem wizard/consentimentos Etapa 4).';

revoke all on function public.transfer_vehicle_ownership_base from public;
grant execute on function public.transfer_vehicle_ownership_base to authenticated;

-- Remoção de membership NÃO apaga identity (já é ON DELETE SET NULL no FK).
-- Opcional: ao deletar membership, se era o único slot do customer no período aberto, não fecha ownership automaticamente (Etapa 1).
