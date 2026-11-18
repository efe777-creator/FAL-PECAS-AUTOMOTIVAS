-- PLANO 2B / Etapa 1: vehicle_visual_configs (2D).
-- Visual ≠ fato: salvar pintura NÃO cria vehicle_events / G7.
-- Chave = vehicle_identities.id (sem segundo cadastro).

create table if not exists public.vehicle_visual_configs (
  id uuid primary key default gen_random_uuid(),
  vehicle_identity_id uuid not null references public.vehicle_identities (id) on delete cascade,
  ownership_period_id uuid references public.vehicle_ownership_periods (id) on delete set null,
  owner_customer_id uuid not null references public.customers (id) on delete cascade,
  -- payload: bodyColorHex, accentHex, wheelStyle, finish, label, notes (2D only)
  payload jsonb not null default '{}'::jsonb,
  visibility text not null default 'private_owner'
    check (visibility in ('private_owner', 'period', 'shared', 'public_vehicle')),
  updated_by_user_id uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint vvc_one_active_per_owner_identity
    unique (vehicle_identity_id, owner_customer_id)
);

comment on table public.vehicle_visual_configs is
  'PLANO 2B E1: aparência 2D por identity+owner. Visual ≠ fato técnico 2A.';

create index if not exists vvc_identity_idx
  on public.vehicle_visual_configs (vehicle_identity_id);

alter table public.vehicle_visual_configs enable row level security;

drop policy if exists vvc_select_authorized on public.vehicle_visual_configs;
create policy vvc_select_authorized on public.vehicle_visual_configs
  for select to authenticated
  using (
    public.is_staff()
    or owner_customer_id = public.current_customer_id()
    or (
      visibility = 'public_vehicle'
      and exists (
        select 1 from public.vehicle_ownership_periods p
        where p.vehicle_identity_id = vehicle_visual_configs.vehicle_identity_id
          and p.customer_id = public.current_customer_id()
      )
    )
    or (
      visibility in ('period', 'shared')
      and ownership_period_id is not null
      and exists (
        select 1 from public.vehicle_ownership_periods p
        where p.id = vehicle_visual_configs.ownership_period_id
          and p.customer_id = public.current_customer_id()
      )
    )
  );

drop policy if exists vvc_insert_owner on public.vehicle_visual_configs;
create policy vvc_insert_owner on public.vehicle_visual_configs
  for insert to authenticated
  with check (
    public.is_staff()
    or (
      owner_customer_id = public.current_customer_id()
      and exists (
        select 1 from public.vehicle_ownership_periods p
        where p.vehicle_identity_id = vehicle_visual_configs.vehicle_identity_id
          and p.customer_id = public.current_customer_id()
          and p.ended_at is null
      )
    )
  );

drop policy if exists vvc_update_owner on public.vehicle_visual_configs;
create policy vvc_update_owner on public.vehicle_visual_configs
  for update to authenticated
  using (
    public.is_staff()
    or owner_customer_id = public.current_customer_id()
  )
  with check (
    public.is_staff()
    or owner_customer_id = public.current_customer_id()
  );

revoke all on public.vehicle_visual_configs from public;
grant select, insert, update on public.vehicle_visual_configs to authenticated;

-- Upsert seguro (owner vigente); não toca events/G7
create or replace function public.upsert_vehicle_visual_config(
  p_vehicle_identity_id uuid,
  p_payload jsonb default '{}'::jsonb,
  p_visibility text default 'private_owner'
)
returns public.vehicle_visual_configs
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_customer uuid := public.current_customer_id();
  v_period uuid;
  v_row public.vehicle_visual_configs;
  v_vis text := coalesce(nullif(trim(p_visibility), ''), 'private_owner');
begin
  if v_customer is null then
    raise exception 'customer not found' using errcode = '42501';
  end if;

  if v_vis not in ('private_owner', 'period', 'shared', 'public_vehicle') then
    raise exception 'invalid visibility' using errcode = '22023';
  end if;

  select id into v_period
  from public.vehicle_ownership_periods
  where vehicle_identity_id = p_vehicle_identity_id
    and customer_id = v_customer
    and ended_at is null
  limit 1;

  if v_period is null and not public.is_staff() then
    raise exception 'not current owner' using errcode = '42501';
  end if;

  insert into public.vehicle_visual_configs (
    vehicle_identity_id, ownership_period_id, owner_customer_id,
    payload, visibility, updated_by_user_id, updated_at
  ) values (
    p_vehicle_identity_id, v_period, v_customer,
    coalesce(p_payload, '{}'::jsonb), v_vis, auth.uid(), now()
  )
  on conflict (vehicle_identity_id, owner_customer_id) do update
    set payload = excluded.payload,
        visibility = excluded.visibility,
        ownership_period_id = excluded.ownership_period_id,
        updated_by_user_id = excluded.updated_by_user_id,
        updated_at = now()
  returning * into v_row;

  return v_row;
end;
$$;

revoke all on function public.upsert_vehicle_visual_config from public;
grant execute on function public.upsert_vehicle_visual_config to authenticated;
