-- PLANO 2A / Etapa 5: schedules de manutenção + lembretes.
-- Insights são computados no app (estimativa ≠ diagnóstico). G6 intacto.

create table if not exists public.vehicle_maintenance_schedules (
  id uuid primary key default gen_random_uuid(),
  vehicle_identity_id uuid not null references public.vehicle_identities (id) on delete cascade,
  title text not null,
  description text,
  schedule_kind text not null default 'both'
    check (schedule_kind in ('time', 'km', 'both')),
  interval_days integer check (interval_days is null or interval_days > 0),
  interval_km integer check (interval_km is null or interval_km > 0),
  last_done_at timestamptz,
  last_done_km integer check (last_done_km is null or last_done_km >= 0),
  next_due_at timestamptz,
  next_due_km integer check (next_due_km is null or next_due_km >= 0),
  source text not null default 'customer'
    check (source in ('customer', 'system', 'estimated', 'professional')),
  active boolean not null default true,
  created_by_customer_id uuid references public.customers (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint vms_has_interval check (
    (schedule_kind = 'time' and interval_days is not null)
    or (schedule_kind = 'km' and interval_km is not null)
    or (schedule_kind = 'both' and interval_days is not null and interval_km is not null)
  )
);

comment on table public.vehicle_maintenance_schedules is
  'PLANO 2A E5: lembretes tempo/km. Fonte etiquetada; estimativa ≠ diagnóstico.';

create index if not exists vms_identity_active_idx
  on public.vehicle_maintenance_schedules (vehicle_identity_id)
  where active = true;

alter table public.vehicle_maintenance_schedules enable row level security;

drop policy if exists vms_select_related on public.vehicle_maintenance_schedules;
create policy vms_select_related on public.vehicle_maintenance_schedules
  for select to authenticated
  using (
    public.is_staff()
    or exists (
      select 1 from public.vehicle_ownership_periods p
      where p.vehicle_identity_id = vehicle_maintenance_schedules.vehicle_identity_id
        and p.customer_id = public.current_customer_id()
    )
  );

drop policy if exists vms_insert_owner on public.vehicle_maintenance_schedules;
create policy vms_insert_owner on public.vehicle_maintenance_schedules
  for insert to authenticated
  with check (
    public.is_staff()
    or (
      created_by_customer_id = public.current_customer_id()
      and exists (
        select 1 from public.vehicle_ownership_periods p
        where p.vehicle_identity_id = vehicle_maintenance_schedules.vehicle_identity_id
          and p.customer_id = public.current_customer_id()
          and p.ended_at is null
      )
    )
  );

drop policy if exists vms_update_owner on public.vehicle_maintenance_schedules;
create policy vms_update_owner on public.vehicle_maintenance_schedules
  for update to authenticated
  using (
    public.is_staff()
    or exists (
      select 1 from public.vehicle_ownership_periods p
      where p.vehicle_identity_id = vehicle_maintenance_schedules.vehicle_identity_id
        and p.customer_id = public.current_customer_id()
        and p.ended_at is null
    )
  )
  with check (
    public.is_staff()
    or exists (
      select 1 from public.vehicle_ownership_periods p
      where p.vehicle_identity_id = vehicle_maintenance_schedules.vehicle_identity_id
        and p.customer_id = public.current_customer_id()
        and p.ended_at is null
    )
  );

revoke all on public.vehicle_maintenance_schedules from public;
grant select, insert, update on public.vehicle_maintenance_schedules to authenticated;

-- RPC: criar/atualizar schedule (owner vigente)
create or replace function public.upsert_vehicle_maintenance_schedule(
  p_id uuid default null,
  p_vehicle_identity_id uuid default null,
  p_title text default null,
  p_description text default null,
  p_schedule_kind text default 'both',
  p_interval_days integer default null,
  p_interval_km integer default null,
  p_last_done_at timestamptz default null,
  p_last_done_km integer default null,
  p_source text default 'customer',
  p_active boolean default true
)
returns public.vehicle_maintenance_schedules
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_customer uuid := public.current_customer_id();
  v_identity uuid;
  v_row public.vehicle_maintenance_schedules;
  v_next_at timestamptz;
  v_next_km integer;
begin
  if v_customer is null then
    raise exception 'customer not found' using errcode = '42501';
  end if;

  if p_id is not null then
    select vehicle_identity_id into v_identity
    from public.vehicle_maintenance_schedules where id = p_id;
    if v_identity is null then
      raise exception 'schedule not found' using errcode = 'P0002';
    end if;
  else
    v_identity := p_vehicle_identity_id;
  end if;

  if v_identity is null then
    raise exception 'identity required' using errcode = '22023';
  end if;

  if not exists (
    select 1 from public.vehicle_ownership_periods
    where vehicle_identity_id = v_identity
      and customer_id = v_customer and ended_at is null
  ) and not public.is_staff() then
    raise exception 'not current owner' using errcode = '42501';
  end if;

  if p_id is null and nullif(trim(coalesce(p_title, '')), '') is null then
    raise exception 'title required' using errcode = '22023';
  end if;

  v_next_at := case
    when coalesce(p_schedule_kind, 'both') in ('time', 'both')
      and p_interval_days is not null
      and coalesce(p_last_done_at, now()) is not null
    then coalesce(p_last_done_at, now()) + make_interval(days => p_interval_days)
    else null
  end;

  v_next_km := case
    when coalesce(p_schedule_kind, 'both') in ('km', 'both')
      and p_interval_km is not null
      and p_last_done_km is not null
    then p_last_done_km + p_interval_km
    else null
  end;

  if p_id is null then
    insert into public.vehicle_maintenance_schedules (
      vehicle_identity_id, title, description, schedule_kind,
      interval_days, interval_km, last_done_at, last_done_km,
      next_due_at, next_due_km, source, active, created_by_customer_id
    ) values (
      v_identity, trim(p_title), nullif(trim(coalesce(p_description, '')), ''),
      coalesce(p_schedule_kind, 'both'),
      p_interval_days, p_interval_km, p_last_done_at, p_last_done_km,
      v_next_at, v_next_km, coalesce(p_source, 'customer'), coalesce(p_active, true),
      v_customer
    )
    returning * into v_row;
  else
    update public.vehicle_maintenance_schedules
    set
      title = coalesce(nullif(trim(coalesce(p_title, '')), ''), title),
      description = coalesce(nullif(trim(coalesce(p_description, '')), ''), description),
      schedule_kind = coalesce(p_schedule_kind, schedule_kind),
      interval_days = coalesce(p_interval_days, interval_days),
      interval_km = coalesce(p_interval_km, interval_km),
      last_done_at = coalesce(p_last_done_at, last_done_at),
      last_done_km = coalesce(p_last_done_km, last_done_km),
      next_due_at = coalesce(v_next_at, next_due_at),
      next_due_km = coalesce(v_next_km, next_due_km),
      source = coalesce(p_source, source),
      active = coalesce(p_active, active),
      updated_at = now()
    where id = p_id
    returning * into v_row;
  end if;

  return v_row;
end;
$$;

revoke all on function public.upsert_vehicle_maintenance_schedule from public;
grant execute on function public.upsert_vehicle_maintenance_schedule to authenticated;
