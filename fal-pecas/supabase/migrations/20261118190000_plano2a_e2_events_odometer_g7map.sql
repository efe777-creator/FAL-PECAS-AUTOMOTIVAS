-- PLANO 2A / Etapa 2: vehicle_events + revisions + odometer + G7 map associativo + stub cols.
-- G7 rows permanecem append-only (sem UPDATE).

-- ---------------------------------------------------------------------------
-- 1) Odômetro canônico
-- ---------------------------------------------------------------------------
create table if not exists public.vehicle_odometer_records (
  id uuid primary key default gen_random_uuid(),
  vehicle_identity_id uuid not null references public.vehicle_identities (id) on delete cascade,
  km integer not null check (km >= 0),
  recorded_at timestamptz not null default now(),
  source text not null default 'customer'
    check (source in ('customer', 'system', 'professional', 'estimated')),
  author_user_id uuid references auth.users (id) on delete set null,
  recording_customer_id uuid references public.customers (id) on delete set null,
  note text,
  created_at timestamptz not null default now()
);

comment on table public.vehicle_odometer_records is
  'PLANO 2A E2: leituras canônicas de km. Ausência ≠ zero.';

create index if not exists vor_identity_recorded_idx
  on public.vehicle_odometer_records (vehicle_identity_id, recorded_at desc);

alter table public.vehicle_odometer_records enable row level security;

drop policy if exists vor_select_related on public.vehicle_odometer_records;
create policy vor_select_related on public.vehicle_odometer_records
  for select to authenticated
  using (
    public.is_staff()
    or exists (
      select 1 from public.vehicle_ownership_periods p
      where p.vehicle_identity_id = vehicle_odometer_records.vehicle_identity_id
        and p.customer_id = public.current_customer_id()
    )
  );

drop policy if exists vor_insert_owner on public.vehicle_odometer_records;
create policy vor_insert_owner on public.vehicle_odometer_records
  for insert to authenticated
  with check (
    public.is_staff()
    or exists (
      select 1 from public.vehicle_ownership_periods p
      where p.vehicle_identity_id = vehicle_odometer_records.vehicle_identity_id
        and p.customer_id = public.current_customer_id()
        and p.ended_at is null
    )
  );

revoke all on public.vehicle_odometer_records from public;
grant select, insert on public.vehicle_odometer_records to authenticated;

-- ---------------------------------------------------------------------------
-- 2) Eventos genéricos
-- ---------------------------------------------------------------------------
create table if not exists public.vehicle_events (
  id uuid primary key default gen_random_uuid(),
  vehicle_identity_id uuid not null references public.vehicle_identities (id) on delete cascade,
  ownership_period_id uuid references public.vehicle_ownership_periods (id) on delete set null,
  category text not null
    check (category in (
      'aquisicao', 'transferencia', 'manutencao', 'reparo', 'inspecao',
      'compra_pecas', 'recebimento', 'instalacao', 'substituicao', 'modificacao',
      'documentacao', 'quilometragem', 'outro'
    )),
  title text not null,
  description text,
  occurred_at timestamptz not null,
  recorded_at timestamptz not null default now(),
  odometer_km integer check (odometer_km is null or odometer_km >= 0),
  odometer_record_id uuid references public.vehicle_odometer_records (id) on delete set null,
  author_user_id uuid references auth.users (id) on delete set null,
  recording_customer_id uuid references public.customers (id) on delete set null,
  provenance text not null default 'customer'
    check (provenance in ('customer', 'system', 'professional', 'commerce')),
  validation_state text not null default 'declarado'
    check (validation_state in (
      'declarado', 'documentado', 'confirmado', 'verificado',
      'contestado', 'retificado', 'rejeitado'
    )),
  origin_ref jsonb not null default '{}'::jsonb,
  -- Attachment stub (E2–E3); biblioteca completa = E4
  stub_storage_path text,
  stub_mime text,
  stub_uploaded_by uuid references auth.users (id) on delete set null,
  stub_uploaded_at timestamptz,
  created_at timestamptz not null default now()
);

comment on table public.vehicle_events is
  'PLANO 2A E2: acontecimentos da identity. Sem DELETE; correção via revisions.';

create index if not exists ve_identity_occurred_idx
  on public.vehicle_events (vehicle_identity_id, occurred_at desc);

create index if not exists ve_period_idx
  on public.vehicle_events (ownership_period_id)
  where ownership_period_id is not null;

create index if not exists ve_category_idx
  on public.vehicle_events (vehicle_identity_id, category);

alter table public.vehicle_events enable row level security;

drop policy if exists ve_select_related on public.vehicle_events;
create policy ve_select_related on public.vehicle_events
  for select to authenticated
  using (
    public.is_staff()
    or exists (
      select 1 from public.vehicle_ownership_periods p
      where p.vehicle_identity_id = vehicle_events.vehicle_identity_id
        and p.customer_id = public.current_customer_id()
    )
  );

drop policy if exists ve_insert_owner on public.vehicle_events;
create policy ve_insert_owner on public.vehicle_events
  for insert to authenticated
  with check (
    public.is_staff()
    or (
      recording_customer_id = public.current_customer_id()
      and exists (
        select 1 from public.vehicle_ownership_periods p
        where p.vehicle_identity_id = vehicle_events.vehicle_identity_id
          and p.customer_id = public.current_customer_id()
          and p.ended_at is null
      )
    )
  );

-- Sem UPDATE/DELETE direto: transitions via RPC
revoke all on public.vehicle_events from public;
grant select, insert on public.vehicle_events to authenticated;

-- ---------------------------------------------------------------------------
-- 3) Revisions (auditoria de correção / validação)
-- ---------------------------------------------------------------------------
create table if not exists public.vehicle_event_revisions (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.vehicle_events (id) on delete cascade,
  previous_state text,
  new_state text,
  reason text not null,
  origin text not null default 'customer',
  revised_by uuid references auth.users (id) on delete set null,
  before jsonb not null default '{}'::jsonb,
  after jsonb not null default '{}'::jsonb,
  revised_at timestamptz not null default now()
);

create index if not exists ver_event_idx
  on public.vehicle_event_revisions (event_id, revised_at desc);

alter table public.vehicle_event_revisions enable row level security;

drop policy if exists ver_select_related on public.vehicle_event_revisions;
create policy ver_select_related on public.vehicle_event_revisions
  for select to authenticated
  using (
    public.is_staff()
    or exists (
      select 1
      from public.vehicle_events e
      join public.vehicle_ownership_periods p
        on p.vehicle_identity_id = e.vehicle_identity_id
      where e.id = vehicle_event_revisions.event_id
        and p.customer_id = public.current_customer_id()
    )
  );

revoke all on public.vehicle_event_revisions from public;
grant select on public.vehicle_event_revisions to authenticated;

-- ---------------------------------------------------------------------------
-- 4) Bridge G7 associativo (append-only nas rows G7)
-- ---------------------------------------------------------------------------
create table if not exists public.customer_vehicle_part_event_identities (
  part_event_id uuid primary key
    references public.customer_vehicle_part_events (id) on delete cascade,
  vehicle_identity_id uuid not null references public.vehicle_identities (id) on delete cascade,
  membership_id uuid references public.customer_vehicles (id) on delete set null,
  mapped_at timestamptz not null default now(),
  mapped_via text not null default 'backfill'
    check (mapped_via in ('backfill', 'on_insert', 'manual', 'merge'))
);

comment on table public.customer_vehicle_part_event_identities is
  'PLANO 2A E2: mapa G7→identity sem mutar customer_vehicle_part_events.';

create index if not exists cvpei_identity_idx
  on public.customer_vehicle_part_event_identities (vehicle_identity_id);

alter table public.customer_vehicle_part_event_identities enable row level security;

drop policy if exists cvpei_select_related on public.customer_vehicle_part_event_identities;
create policy cvpei_select_related on public.customer_vehicle_part_event_identities
  for select to authenticated
  using (
    public.is_staff()
    or exists (
      select 1 from public.vehicle_ownership_periods p
      where p.vehicle_identity_id = customer_vehicle_part_event_identities.vehicle_identity_id
        and p.customer_id = public.current_customer_id()
    )
  );

revoke all on public.customer_vehicle_part_event_identities from public;
grant select on public.customer_vehicle_part_event_identities to authenticated;

-- Backfill mapa a partir de membership
insert into public.customer_vehicle_part_event_identities (
  part_event_id, vehicle_identity_id, membership_id, mapped_via
)
select
  e.id,
  cv.vehicle_identity_id,
  e.customer_vehicle_id,
  'backfill'
from public.customer_vehicle_part_events e
join public.customer_vehicles cv on cv.id = e.customer_vehicle_id
where cv.vehicle_identity_id is not null
  and not exists (
    select 1 from public.customer_vehicle_part_event_identities m
    where m.part_event_id = e.id
  );

-- Ao inserir G7 com membership, mapear automaticamente (sem UPDATE G7)
create or replace function public.cvpe_map_identity_on_insert()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_identity uuid;
begin
  if new.customer_vehicle_id is null then
    return new;
  end if;

  select vehicle_identity_id into v_identity
  from public.customer_vehicles
  where id = new.customer_vehicle_id;

  if v_identity is null then
    return new;
  end if;

  insert into public.customer_vehicle_part_event_identities (
    part_event_id, vehicle_identity_id, membership_id, mapped_via
  ) values (
    new.id, v_identity, new.customer_vehicle_id, 'on_insert'
  )
  on conflict (part_event_id) do nothing;

  return new;
end;
$$;

drop trigger if exists cvpe_map_identity_trg on public.customer_vehicle_part_events;
create trigger cvpe_map_identity_trg
  after insert on public.customer_vehicle_part_events
  for each row execute function public.cvpe_map_identity_on_insert();

-- ---------------------------------------------------------------------------
-- 5) RPC: declarar evento (customer)
-- ---------------------------------------------------------------------------
create or replace function public.append_vehicle_event(
  p_vehicle_identity_id uuid,
  p_category text,
  p_title text,
  p_description text default null,
  p_occurred_at timestamptz default now(),
  p_odometer_km integer default null,
  p_create_odometer_record boolean default false,
  p_origin_ref jsonb default '{}'::jsonb
)
returns public.vehicle_events
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_customer uuid := public.current_customer_id();
  v_period uuid;
  v_odo uuid;
  v_row public.vehicle_events;
begin
  if v_customer is null then
    raise exception 'customer not found' using errcode = '42501';
  end if;

  select id into v_period
  from public.vehicle_ownership_periods
  where vehicle_identity_id = p_vehicle_identity_id
    and customer_id = v_customer
    and ended_at is null
  limit 1;

  if v_period is null then
    raise exception 'not current owner' using errcode = '42501';
  end if;

  if p_create_odometer_record and p_odometer_km is not null then
    insert into public.vehicle_odometer_records (
      vehicle_identity_id, km, recorded_at, source,
      author_user_id, recording_customer_id
    ) values (
      p_vehicle_identity_id, p_odometer_km, coalesce(p_occurred_at, now()), 'customer',
      auth.uid(), v_customer
    )
    returning id into v_odo;
  end if;

  insert into public.vehicle_events (
    vehicle_identity_id, ownership_period_id, category, title, description,
    occurred_at, odometer_km, odometer_record_id,
    author_user_id, recording_customer_id, provenance, validation_state, origin_ref
  ) values (
    p_vehicle_identity_id, v_period, p_category, trim(p_title), nullif(trim(coalesce(p_description, '')), ''),
    coalesce(p_occurred_at, now()), p_odometer_km, v_odo,
    auth.uid(), v_customer, 'customer', 'declarado', coalesce(p_origin_ref, '{}'::jsonb)
  )
  returning * into v_row;

  return v_row;
end;
$$;

revoke all on function public.append_vehicle_event from public;
grant execute on function public.append_vehicle_event to authenticated;

-- ---------------------------------------------------------------------------
-- 6) RPC: transição de validação (com revision)
-- ---------------------------------------------------------------------------
create or replace function public.transition_vehicle_event_validation(
  p_event_id uuid,
  p_new_state text,
  p_reason text
)
returns public.vehicle_events
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_customer uuid := public.current_customer_id();
  v_row public.vehicle_events;
  v_prev text;
begin
  if v_customer is null then
    raise exception 'customer not found' using errcode = '42501';
  end if;

  if nullif(trim(coalesce(p_reason, '')), '') is null then
    raise exception 'reason required' using errcode = '22023';
  end if;

  select * into v_row
  from public.vehicle_events
  where id = p_event_id
  for update;

  if not found then
    raise exception 'event not found' using errcode = 'P0002';
  end if;

  if not exists (
    select 1 from public.vehicle_ownership_periods p
    where p.vehicle_identity_id = v_row.vehicle_identity_id
      and p.customer_id = v_customer
      and p.ended_at is null
  ) and not public.is_staff() then
    raise exception 'not allowed' using errcode = '42501';
  end if;

  v_prev := v_row.validation_state;

  if v_prev = p_new_state then
    return v_row;
  end if;

  -- Transições permitidas (owner): declarado→documentado|confirmado|contestado|rejeitado;
  -- documentado→confirmado|contestado|rejeitado; contestado→retificado; retificado→declarado
  if not (
    (v_prev = 'declarado' and p_new_state in ('documentado', 'confirmado', 'contestado', 'rejeitado'))
    or (v_prev = 'documentado' and p_new_state in ('confirmado', 'contestado', 'rejeitado'))
    or (v_prev = 'confirmado' and p_new_state in ('verificado', 'contestado') and public.is_staff())
    or (v_prev = 'contestado' and p_new_state = 'retificado')
    or (v_prev = 'retificado' and p_new_state = 'declarado')
  ) then
    raise exception 'invalid transition % -> %', v_prev, p_new_state using errcode = '22023';
  end if;

  update public.vehicle_events
  set validation_state = p_new_state
  where id = p_event_id
  returning * into v_row;

  insert into public.vehicle_event_revisions (
    event_id, previous_state, new_state, reason, origin, revised_by, before, after
  ) values (
    p_event_id, v_prev, p_new_state, trim(p_reason), 'customer', auth.uid(),
    jsonb_build_object('validation_state', v_prev),
    jsonb_build_object('validation_state', p_new_state)
  );

  return v_row;
end;
$$;

-- UPDATE em vehicle_events só via este RPC (security definer)
revoke all on function public.transition_vehicle_event_validation from public;
grant execute on function public.transition_vehicle_event_validation to authenticated;
