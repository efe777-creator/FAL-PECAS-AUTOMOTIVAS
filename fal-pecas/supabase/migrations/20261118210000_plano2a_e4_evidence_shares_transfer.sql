-- PLANO 2A / Etapa 4: evidências N:N, shares, access logs, wizard transferência.
-- Disclaimer: FAL não substitui DETRAN. Share ≠ histórico total. Revoke no servidor.

-- ---------------------------------------------------------------------------
-- 1) Evidências
-- ---------------------------------------------------------------------------
create table if not exists public.vehicle_evidence (
  id uuid primary key default gen_random_uuid(),
  vehicle_identity_id uuid not null references public.vehicle_identities (id) on delete cascade,
  ownership_period_id uuid references public.vehicle_ownership_periods (id) on delete set null,
  evidence_type text not null
    check (evidence_type in (
      'nf', 'os', 'recibo', 'foto', 'video', 'laudo',
      'doc_tecnico', 'comprovante_compra', 'comprovante_instalacao',
      'registro_km', 'outro'
    )),
  title text not null,
  storage_path text not null,
  mime text,
  byte_size integer check (byte_size is null or byte_size >= 0),
  visibility text not null default 'private_owner'
    check (visibility in ('private_owner', 'period', 'shared', 'public_vehicle')),
  uploaded_by_user_id uuid references auth.users (id) on delete set null,
  uploaded_by_customer_id uuid references public.customers (id) on delete set null,
  created_at timestamptz not null default now(),
  constraint vehicle_evidence_path_uniq unique (storage_path)
);

comment on table public.vehicle_evidence is
  'PLANO 2A E4: biblioteca de evidências. Desvincular ≠ apagar.';

create index if not exists vevd_identity_idx
  on public.vehicle_evidence (vehicle_identity_id, created_at desc);

alter table public.vehicle_evidence enable row level security;

-- Select completo (com shares) recriado após §3
drop policy if exists vevd_insert_owner on public.vehicle_evidence;
create policy vevd_insert_owner on public.vehicle_evidence
  for insert to authenticated
  with check (
    public.is_staff()
    or (
      uploaded_by_customer_id = public.current_customer_id()
      and exists (
        select 1 from public.vehicle_ownership_periods p
        where p.vehicle_identity_id = vehicle_evidence.vehicle_identity_id
          and p.customer_id = public.current_customer_id()
          and p.ended_at is null
      )
    )
  );

-- Sem DELETE direto do cliente (ops/RPC futuro); update visibility só pelo dono uploader/owner
drop policy if exists vevd_update_owner on public.vehicle_evidence;
create policy vevd_update_owner on public.vehicle_evidence
  for update to authenticated
  using (
    public.is_staff()
    or uploaded_by_customer_id = public.current_customer_id()
    or exists (
      select 1 from public.vehicle_ownership_periods p
      where p.vehicle_identity_id = vehicle_evidence.vehicle_identity_id
        and p.customer_id = public.current_customer_id()
        and p.ended_at is null
    )
  )
  with check (
    public.is_staff()
    or uploaded_by_customer_id = public.current_customer_id()
    or exists (
      select 1 from public.vehicle_ownership_periods p
      where p.vehicle_identity_id = vehicle_evidence.vehicle_identity_id
        and p.customer_id = public.current_customer_id()
        and p.ended_at is null
    )
  );

revoke all on public.vehicle_evidence from public;
grant select, insert, update on public.vehicle_evidence to authenticated;

-- ---------------------------------------------------------------------------
-- 2) N:N evidência ↔ evento
-- ---------------------------------------------------------------------------
create table if not exists public.vehicle_event_evidence (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.vehicle_events (id) on delete cascade,
  evidence_id uuid not null references public.vehicle_evidence (id) on delete cascade,
  linked_at timestamptz not null default now(),
  linked_by_customer_id uuid references public.customers (id) on delete set null,
  meta jsonb not null default '{}'::jsonb,
  unique (event_id, evidence_id)
);

comment on table public.vehicle_event_evidence is
  'PLANO 2A E4: N:N. Desvincular ≠ apagar arquivo.';

create index if not exists vee_evidence_idx on public.vehicle_event_evidence (evidence_id);
create index if not exists vee_event_idx on public.vehicle_event_evidence (event_id);

alter table public.vehicle_event_evidence enable row level security;

drop policy if exists vee_select_related on public.vehicle_event_evidence;
create policy vee_select_related on public.vehicle_event_evidence
  for select to authenticated
  using (
    public.is_staff()
    or exists (
      select 1 from public.vehicle_events e
      join public.vehicle_ownership_periods p on p.vehicle_identity_id = e.vehicle_identity_id
      where e.id = vehicle_event_evidence.event_id
        and p.customer_id = public.current_customer_id()
    )
  );

drop policy if exists vee_insert_owner on public.vehicle_event_evidence;
create policy vee_insert_owner on public.vehicle_event_evidence
  for insert to authenticated
  with check (
    public.is_staff()
    or (
      linked_by_customer_id = public.current_customer_id()
      and exists (
        select 1 from public.vehicle_events e
        join public.vehicle_ownership_periods p on p.vehicle_identity_id = e.vehicle_identity_id
        where e.id = vehicle_event_evidence.event_id
          and p.customer_id = public.current_customer_id()
          and p.ended_at is null
      )
    )
  );

drop policy if exists vee_delete_owner on public.vehicle_event_evidence;
create policy vee_delete_owner on public.vehicle_event_evidence
  for delete to authenticated
  using (
    public.is_staff()
    or exists (
      select 1 from public.vehicle_events e
      join public.vehicle_ownership_periods p on p.vehicle_identity_id = e.vehicle_identity_id
      where e.id = vehicle_event_evidence.event_id
        and p.customer_id = public.current_customer_id()
        and p.ended_at is null
    )
  );

revoke all on public.vehicle_event_evidence from public;
grant select, insert, delete on public.vehicle_event_evidence to authenticated;

-- ---------------------------------------------------------------------------
-- 3) Shares (granular; revoke no servidor)
-- ---------------------------------------------------------------------------
create table if not exists public.vehicle_shares (
  id uuid primary key default gen_random_uuid(),
  vehicle_identity_id uuid not null references public.vehicle_identities (id) on delete cascade,
  grantor_customer_id uuid not null references public.customers (id) on delete cascade,
  grantee_type text not null default 'customer'
    check (grantee_type in ('customer', 'professional')),
  grantee_customer_id uuid references public.customers (id) on delete cascade,
  grantee_professional_id uuid references public.professional_profiles (id) on delete cascade,
  modules text[] not null default array['visao']::text[],
  can_read_basics boolean not null default true,
  can_read_history boolean not null default false,
  can_read_evidence boolean not null default false,
  can_register_event boolean not null default false,
  can_update_km boolean not null default false,
  expires_at timestamptz,
  revoked_at timestamptz,
  revoked_by uuid references public.customers (id) on delete set null,
  note text,
  created_at timestamptz not null default now(),
  constraint vs_grantee_one check (
    (grantee_type = 'customer' and grantee_customer_id is not null)
    or (grantee_type = 'professional' and grantee_professional_id is not null)
  )
);

comment on table public.vehicle_shares is
  'PLANO 2A E4: grants granulares. Share ≠ histórico total por default.';

create index if not exists vs_identity_idx on public.vehicle_shares (vehicle_identity_id);
create index if not exists vs_grantee_customer_idx
  on public.vehicle_shares (grantee_customer_id)
  where revoked_at is null;

alter table public.vehicle_shares enable row level security;

drop policy if exists vs_select_parties on public.vehicle_shares;
create policy vs_select_parties on public.vehicle_shares
  for select to authenticated
  using (
    public.is_staff()
    or grantor_customer_id = public.current_customer_id()
    or grantee_customer_id = public.current_customer_id()
  );

-- Mutações via RPC
revoke all on public.vehicle_shares from public;
grant select on public.vehicle_shares to authenticated;

-- Fix forward ref: vehicle_evidence policy already references vehicle_shares — OK if created above first
-- Recreate evidence select after shares exist (idempotent)
drop policy if exists vevd_select_authorized on public.vehicle_evidence;
create policy vevd_select_authorized on public.vehicle_evidence
  for select to authenticated
  using (
    public.is_staff()
    or uploaded_by_customer_id = public.current_customer_id()
    or (
      visibility = 'public_vehicle'
      and exists (
        select 1 from public.vehicle_ownership_periods p
        where p.vehicle_identity_id = vehicle_evidence.vehicle_identity_id
          and p.customer_id = public.current_customer_id()
      )
    )
    or (
      visibility in ('period', 'shared')
      and ownership_period_id is not null
      and exists (
        select 1 from public.vehicle_ownership_periods p
        where p.id = vehicle_evidence.ownership_period_id
          and p.customer_id = public.current_customer_id()
      )
    )
    or (
      visibility = 'shared'
      and exists (
        select 1 from public.vehicle_shares s
        where s.vehicle_identity_id = vehicle_evidence.vehicle_identity_id
          and s.grantee_customer_id = public.current_customer_id()
          and s.revoked_at is null
          and (s.expires_at is null or s.expires_at > now())
          and s.can_read_evidence = true
      )
    )
    or exists (
      select 1 from public.vehicle_ownership_periods p
      where p.vehicle_identity_id = vehicle_evidence.vehicle_identity_id
        and p.customer_id = public.current_customer_id()
        and p.ended_at is null
        and vehicle_evidence.visibility in ('period', 'shared', 'public_vehicle')
    )
  );

-- ---------------------------------------------------------------------------
-- 4) Access logs
-- ---------------------------------------------------------------------------
create table if not exists public.vehicle_access_logs (
  id uuid primary key default gen_random_uuid(),
  vehicle_identity_id uuid not null references public.vehicle_identities (id) on delete cascade,
  actor_customer_id uuid references public.customers (id) on delete set null,
  actor_user_id uuid references auth.users (id) on delete set null,
  action text not null,
  resource_type text,
  resource_id uuid,
  meta jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists val_identity_idx
  on public.vehicle_access_logs (vehicle_identity_id, created_at desc);

alter table public.vehicle_access_logs enable row level security;

drop policy if exists val_select_owner on public.vehicle_access_logs;
create policy val_select_owner on public.vehicle_access_logs
  for select to authenticated
  using (
    public.is_staff()
    or exists (
      select 1 from public.vehicle_ownership_periods p
      where p.vehicle_identity_id = vehicle_access_logs.vehicle_identity_id
        and p.customer_id = public.current_customer_id()
        and p.ended_at is null
    )
  );

revoke all on public.vehicle_access_logs from public;
grant select on public.vehicle_access_logs to authenticated;

-- ---------------------------------------------------------------------------
-- 5) Transfer requests (wizard)
-- ---------------------------------------------------------------------------
create table if not exists public.vehicle_transfer_requests (
  id uuid primary key default gen_random_uuid(),
  vehicle_identity_id uuid not null references public.vehicle_identities (id) on delete cascade,
  from_customer_id uuid not null references public.customers (id) on delete cascade,
  to_customer_id uuid not null references public.customers (id) on delete cascade,
  status text not null default 'pending'
    check (status in ('pending', 'accepted', 'rejected', 'cancelled', 'expired')),
  consent_share_history boolean not null default false,
  consent_share_private_evidence boolean not null default false,
  note text,
  expires_at timestamptz not null default (now() + interval '7 days'),
  created_at timestamptz not null default now(),
  resolved_at timestamptz,
  resolved_by uuid references public.customers (id) on delete set null
);

comment on table public.vehicle_transfer_requests is
  'PLANO 2A E4: wizard transferência. FAL não substitui DETRAN.';

create unique index if not exists vtr_one_pending_per_identity
  on public.vehicle_transfer_requests (vehicle_identity_id)
  where status = 'pending';

create index if not exists vtr_to_customer_idx
  on public.vehicle_transfer_requests (to_customer_id, status);

alter table public.vehicle_transfer_requests enable row level security;

drop policy if exists vtr_select_parties on public.vehicle_transfer_requests;
create policy vtr_select_parties on public.vehicle_transfer_requests
  for select to authenticated
  using (
    public.is_staff()
    or from_customer_id = public.current_customer_id()
    or to_customer_id = public.current_customer_id()
  );

revoke all on public.vehicle_transfer_requests from public;
grant select on public.vehicle_transfer_requests to authenticated;

-- ---------------------------------------------------------------------------
-- 6) Storage bucket evidências (privado; path = customer_id/identity_id/…)
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'vehicle-evidence',
  'vehicle-evidence',
  false,
  10485760,
  array[
    'image/jpeg', 'image/png', 'image/webp', 'application/pdf',
    'video/mp4', 'video/webm'
  ]
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists vevd_storage_select on storage.objects;
create policy vevd_storage_select on storage.objects
  for select to authenticated
  using (
    bucket_id = 'vehicle-evidence'
    and (
      public.is_staff()
      or (storage.foldername(name))[1] = public.current_customer_id()::text
      or exists (
        select 1 from public.vehicle_evidence e
        where e.storage_path = name
      )
    )
  );

drop policy if exists vevd_storage_insert on storage.objects;
create policy vevd_storage_insert on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'vehicle-evidence'
    and (
      public.is_staff()
      or (storage.foldername(name))[1] = public.current_customer_id()::text
    )
  );

drop policy if exists vevd_storage_delete on storage.objects;
create policy vevd_storage_delete on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'vehicle-evidence'
    and (
      public.is_staff()
      or (storage.foldername(name))[1] = public.current_customer_id()::text
    )
  );

-- ---------------------------------------------------------------------------
-- 7) Helper log
-- ---------------------------------------------------------------------------
create or replace function public.log_vehicle_access(
  p_vehicle_identity_id uuid,
  p_action text,
  p_resource_type text default null,
  p_resource_id uuid default null,
  p_meta jsonb default '{}'::jsonb
)
returns void
language plpgsql
security definer
set search_path to 'public'
as $$
begin
  insert into public.vehicle_access_logs (
    vehicle_identity_id, actor_customer_id, actor_user_id,
    action, resource_type, resource_id, meta
  ) values (
    p_vehicle_identity_id, public.current_customer_id(), auth.uid(),
    p_action, p_resource_type, p_resource_id, coalesce(p_meta, '{}'::jsonb)
  );
end;
$$;

revoke all on function public.log_vehicle_access from public;
grant execute on function public.log_vehicle_access to authenticated;

-- ---------------------------------------------------------------------------
-- 8) RPC shares
-- ---------------------------------------------------------------------------
create or replace function public.create_vehicle_share(
  p_vehicle_identity_id uuid,
  p_grantee_customer_id uuid,
  p_modules text[] default array['visao']::text[],
  p_can_read_history boolean default false,
  p_can_read_evidence boolean default false,
  p_can_register_event boolean default false,
  p_can_update_km boolean default false,
  p_expires_at timestamptz default null,
  p_note text default null
)
returns public.vehicle_shares
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_customer uuid := public.current_customer_id();
  v_row public.vehicle_shares;
begin
  if v_customer is null then
    raise exception 'customer not found' using errcode = '42501';
  end if;
  if p_grantee_customer_id is null or p_grantee_customer_id = v_customer then
    raise exception 'invalid grantee' using errcode = '22023';
  end if;
  if not exists (
    select 1 from public.vehicle_ownership_periods
    where vehicle_identity_id = p_vehicle_identity_id
      and customer_id = v_customer and ended_at is null
  ) then
    raise exception 'not current owner' using errcode = '42501';
  end if;
  if not exists (select 1 from public.customers where id = p_grantee_customer_id) then
    raise exception 'grantee not found' using errcode = 'P0002';
  end if;

  insert into public.vehicle_shares (
    vehicle_identity_id, grantor_customer_id, grantee_type, grantee_customer_id,
    modules, can_read_basics, can_read_history, can_read_evidence,
    can_register_event, can_update_km, expires_at, note
  ) values (
    p_vehicle_identity_id, v_customer, 'customer', p_grantee_customer_id,
    coalesce(p_modules, array['visao']::text[]), true,
    coalesce(p_can_read_history, false), coalesce(p_can_read_evidence, false),
    coalesce(p_can_register_event, false), coalesce(p_can_update_km, false),
    p_expires_at, nullif(trim(coalesce(p_note, '')), '')
  )
  returning * into v_row;

  perform public.log_vehicle_access(
    p_vehicle_identity_id, 'share_create', 'vehicle_share', v_row.id,
    jsonb_build_object('grantee', p_grantee_customer_id)
  );

  return v_row;
end;
$$;

revoke all on function public.create_vehicle_share from public;
grant execute on function public.create_vehicle_share to authenticated;

create or replace function public.revoke_vehicle_share(p_share_id uuid)
returns public.vehicle_shares
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_customer uuid := public.current_customer_id();
  v_row public.vehicle_shares;
begin
  if v_customer is null then
    raise exception 'customer not found' using errcode = '42501';
  end if;

  select * into v_row from public.vehicle_shares where id = p_share_id for update;
  if not found then
    raise exception 'share not found' using errcode = 'P0002';
  end if;
  if v_row.grantor_customer_id <> v_customer and not public.is_staff() then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  if v_row.revoked_at is not null then
    return v_row;
  end if;

  update public.vehicle_shares
  set revoked_at = now(), revoked_by = v_customer
  where id = p_share_id
  returning * into v_row;

  perform public.log_vehicle_access(
    v_row.vehicle_identity_id, 'share_revoke', 'vehicle_share', v_row.id, '{}'::jsonb
  );

  return v_row;
end;
$$;

revoke all on function public.revoke_vehicle_share from public;
grant execute on function public.revoke_vehicle_share to authenticated;

-- ---------------------------------------------------------------------------
-- 9) RPC transferência wizard
-- ---------------------------------------------------------------------------
create or replace function public.request_vehicle_transfer(
  p_vehicle_identity_id uuid,
  p_to_customer_id uuid,
  p_consent_share_history boolean default false,
  p_consent_share_private_evidence boolean default false,
  p_note text default null,
  p_expires_hours integer default 168
)
returns public.vehicle_transfer_requests
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_customer uuid := public.current_customer_id();
  v_row public.vehicle_transfer_requests;
begin
  if v_customer is null then
    raise exception 'customer not found' using errcode = '42501';
  end if;
  if p_to_customer_id is null or p_to_customer_id = v_customer then
    raise exception 'invalid recipient' using errcode = '22023';
  end if;
  if not exists (
    select 1 from public.vehicle_ownership_periods
    where vehicle_identity_id = p_vehicle_identity_id
      and customer_id = v_customer and ended_at is null
  ) then
    raise exception 'not current owner' using errcode = '42501';
  end if;
  if not exists (select 1 from public.customers where id = p_to_customer_id) then
    raise exception 'recipient not found' using errcode = 'P0002';
  end if;
  if exists (
    select 1 from public.vehicle_transfer_requests
    where vehicle_identity_id = p_vehicle_identity_id and status = 'pending'
  ) then
    raise exception 'pending transfer exists' using errcode = '23505';
  end if;

  insert into public.vehicle_transfer_requests (
    vehicle_identity_id, from_customer_id, to_customer_id,
    consent_share_history, consent_share_private_evidence, note, expires_at
  ) values (
    p_vehicle_identity_id, v_customer, p_to_customer_id,
    coalesce(p_consent_share_history, false),
    coalesce(p_consent_share_private_evidence, false),
    nullif(trim(coalesce(p_note, '')), ''),
    now() + make_interval(hours => greatest(coalesce(p_expires_hours, 168), 1))
  )
  returning * into v_row;

  perform public.log_vehicle_access(
    p_vehicle_identity_id, 'transfer_request', 'vehicle_transfer_request', v_row.id,
    jsonb_build_object('to', p_to_customer_id)
  );

  return v_row;
end;
$$;

revoke all on function public.request_vehicle_transfer from public;
grant execute on function public.request_vehicle_transfer to authenticated;

create or replace function public.cancel_vehicle_transfer(p_request_id uuid)
returns public.vehicle_transfer_requests
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_customer uuid := public.current_customer_id();
  v_row public.vehicle_transfer_requests;
begin
  select * into v_row from public.vehicle_transfer_requests where id = p_request_id for update;
  if not found then raise exception 'request not found' using errcode = 'P0002'; end if;
  if v_row.from_customer_id <> v_customer and not public.is_staff() then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  if v_row.status <> 'pending' then
    raise exception 'not pending' using errcode = '22023';
  end if;
  update public.vehicle_transfer_requests
  set status = 'cancelled', resolved_at = now(), resolved_by = v_customer
  where id = p_request_id returning * into v_row;
  perform public.log_vehicle_access(
    v_row.vehicle_identity_id, 'transfer_cancel', 'vehicle_transfer_request', v_row.id, '{}'::jsonb
  );
  return v_row;
end;
$$;

revoke all on function public.cancel_vehicle_transfer from public;
grant execute on function public.cancel_vehicle_transfer to authenticated;

create or replace function public.reject_vehicle_transfer(p_request_id uuid)
returns public.vehicle_transfer_requests
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_customer uuid := public.current_customer_id();
  v_row public.vehicle_transfer_requests;
begin
  select * into v_row from public.vehicle_transfer_requests where id = p_request_id for update;
  if not found then raise exception 'request not found' using errcode = 'P0002'; end if;
  if v_row.to_customer_id <> v_customer and not public.is_staff() then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  if v_row.status <> 'pending' then
    raise exception 'not pending' using errcode = '22023';
  end if;
  if v_row.expires_at < now() then
    update public.vehicle_transfer_requests
    set status = 'expired', resolved_at = now()
    where id = p_request_id returning * into v_row;
    return v_row;
  end if;
  update public.vehicle_transfer_requests
  set status = 'rejected', resolved_at = now(), resolved_by = v_customer
  where id = p_request_id returning * into v_row;
  perform public.log_vehicle_access(
    v_row.vehicle_identity_id, 'transfer_reject', 'vehicle_transfer_request', v_row.id, '{}'::jsonb
  );
  return v_row;
end;
$$;

revoke all on function public.reject_vehicle_transfer from public;
grant execute on function public.reject_vehicle_transfer to authenticated;

create or replace function public.accept_vehicle_transfer(p_request_id uuid)
returns uuid
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_customer uuid := public.current_customer_id();
  v_row public.vehicle_transfer_requests;
  v_period uuid;
begin
  select * into v_row from public.vehicle_transfer_requests where id = p_request_id for update;
  if not found then raise exception 'request not found' using errcode = 'P0002'; end if;
  if v_row.to_customer_id <> v_customer then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  if v_row.status <> 'pending' then
    raise exception 'not pending' using errcode = '22023';
  end if;
  if v_row.expires_at < now() then
    update public.vehicle_transfer_requests
    set status = 'expired', resolved_at = now()
    where id = p_request_id;
    raise exception 'transfer expired' using errcode = '22023';
  end if;

  -- Execução atômica via base E1 (caller deve ser dono atual = from)
  -- Rodamos como security definer: set local context via direct period ops
  -- Reusa a lógica da base: fecha from, abre to
  perform set_config('request.jwt.claim.sub', coalesce(auth.uid()::text, ''), true);

  -- Inline transfer (from must still be open owner)
  if not exists (
    select 1 from public.vehicle_ownership_periods
    where vehicle_identity_id = v_row.vehicle_identity_id
      and customer_id = v_row.from_customer_id and ended_at is null
  ) then
    raise exception 'source no longer owner' using errcode = '42501';
  end if;

  update public.vehicle_ownership_periods
  set ended_at = now(), ended_reason = 'transfer'
  where vehicle_identity_id = v_row.vehicle_identity_id
    and customer_id = v_row.from_customer_id
    and ended_at is null;

  insert into public.vehicle_ownership_periods (
    vehicle_identity_id, customer_id, started_at, started_certainty, registered_at, transfer_id
  ) values (
    v_row.vehicle_identity_id, v_row.to_customer_id, null, 'unknown', now(), v_row.id
  )
  returning id into v_period;

  insert into public.customer_vehicles (
    customer_id, manufacturer_id, model_id, version_id,
    year, engine, maker_text, model_text, version_text, engine_text,
    plate, plate_normalized, vehicle_identity_id, is_primary
  )
  select
    v_row.to_customer_id,
    i.manufacturer_id, i.model_id, i.version_id,
    i.year, i.engine_text, i.maker_text, i.model_text, i.version_text, i.engine_text,
    i.plate_current, i.plate_normalized_current, i.id, false
  from public.vehicle_identities i
  where i.id = v_row.vehicle_identity_id
    and not exists (
      select 1 from public.customer_vehicles cv
      where cv.customer_id = v_row.to_customer_id
        and cv.vehicle_identity_id = v_row.vehicle_identity_id
    );

  -- Revoga shares do grantor anterior (incompatíveis pós-transferência)
  update public.vehicle_shares
  set revoked_at = now(), revoked_by = v_customer
  where vehicle_identity_id = v_row.vehicle_identity_id
    and grantor_customer_id = v_row.from_customer_id
    and revoked_at is null;

  -- Consentimento: promover private_owner do período anterior → shared (opt-in)
  if v_row.consent_share_private_evidence then
    update public.vehicle_evidence e
    set visibility = 'shared'
    where e.vehicle_identity_id = v_row.vehicle_identity_id
      and e.visibility = 'private_owner'
      and e.uploaded_by_customer_id = v_row.from_customer_id;
  end if;

  update public.vehicle_transfer_requests
  set status = 'accepted', resolved_at = now(), resolved_by = v_customer
  where id = p_request_id;

  perform public.log_vehicle_access(
    v_row.vehicle_identity_id, 'transfer_accept', 'vehicle_transfer_request', p_request_id,
    jsonb_build_object(
      'new_period', v_period,
      'consent_history', v_row.consent_share_history,
      'consent_private_evidence', v_row.consent_share_private_evidence
    )
  );

  return v_period;
end;
$$;

revoke all on function public.accept_vehicle_transfer from public;
grant execute on function public.accept_vehicle_transfer to authenticated;
