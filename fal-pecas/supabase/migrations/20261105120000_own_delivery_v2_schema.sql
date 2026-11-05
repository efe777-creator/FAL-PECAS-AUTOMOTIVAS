-- MARCHA Frete Próprio v2 — schema + contrato unificado (POL / veículo / km ida / tarifa por categoria)
-- Fórmula APROVADA: frete = max(km_ida * valor_por_km, tarifa_minima)  -- piso
-- Apply controlado (sem db push cego). D-FRETE B inalterado.
-- Também versiona store_own_delivery_settings (drift: existia no wtbp sem arquivo local).

-- ---------------------------------------------------------------------------
-- 1) Settings (v1 + flags v2)
-- ---------------------------------------------------------------------------
create table if not exists public.store_own_delivery_settings (
  id uuid primary key default gen_random_uuid(),
  enabled boolean not null default false,
  coverage_label text not null default 'São Paulo — capital',
  cep_ranges jsonb not null default '[{"from":"01000000","to":"05999999"}]'::jsonb,
  rates jsonb not null default '[{"id":"own:fal","serviceCode":"fal_sp","label":"Entrega FAL (SP capital)","amount":29.9,"etaDaysMin":1,"etaDaysMax":3}]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists store_own_delivery_settings_singleton
  on public.store_own_delivery_settings ((true));

alter table public.store_own_delivery_settings
  add column if not exists pricing_mode text not null default 'flat';
alter table public.store_own_delivery_settings
  add column if not exists max_distance_km numeric(10, 2);
alter table public.store_own_delivery_settings
  add column if not exists eta_days_min int not null default 1;
alter table public.store_own_delivery_settings
  add column if not exists eta_days_max int not null default 3;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'store_own_delivery_settings_pricing_mode_chk'
  ) then
    alter table public.store_own_delivery_settings
      add constraint store_own_delivery_settings_pricing_mode_chk
      check (pricing_mode in ('flat', 'distance_vehicle'));
  end if;
end $$;

alter table public.store_own_delivery_settings enable row level security;

drop policy if exists store_own_delivery_settings_staff_all on public.store_own_delivery_settings;
create policy store_own_delivery_settings_staff_all on public.store_own_delivery_settings
  for all to authenticated
  using (public.is_staff())
  with check (public.is_staff());

drop policy if exists store_own_delivery_settings_anon_read on public.store_own_delivery_settings;
create policy store_own_delivery_settings_anon_read on public.store_own_delivery_settings
  for select to anon, authenticated
  using (true);

insert into public.store_own_delivery_settings (enabled, coverage_label)
select false, 'São Paulo — capital'
where not exists (select 1 from public.store_own_delivery_settings);

-- ---------------------------------------------------------------------------
-- 2) Veículos + tarifas
-- ---------------------------------------------------------------------------
create table if not exists public.own_vehicle_categories (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  label text not null,
  capacity_pol numeric(10, 2) not null,
  sort_order int not null default 100,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint own_vehicle_categories_capacity_chk check (capacity_pol > 0)
);

create table if not exists public.own_vehicle_tariffs (
  id uuid primary key default gen_random_uuid(),
  category_id uuid not null references public.own_vehicle_categories (id) on delete cascade,
  tarifa_minima numeric(12, 2) not null,
  valor_por_km numeric(12, 4) not null,
  active boolean not null default true,
  version int not null default 1,
  created_at timestamptz not null default now(),
  constraint own_vehicle_tariffs_min_chk check (tarifa_minima >= 0),
  constraint own_vehicle_tariffs_km_chk check (valor_por_km >= 0)
);

create index if not exists own_vehicle_tariffs_category_active_idx
  on public.own_vehicle_tariffs (category_id, active, version desc);

alter table public.own_vehicle_categories enable row level security;
alter table public.own_vehicle_tariffs enable row level security;

drop policy if exists own_vehicle_categories_staff on public.own_vehicle_categories;
create policy own_vehicle_categories_staff on public.own_vehicle_categories
  for all to authenticated using (public.is_staff()) with check (public.is_staff());

drop policy if exists own_vehicle_categories_read on public.own_vehicle_categories;
create policy own_vehicle_categories_read on public.own_vehicle_categories
  for select to anon, authenticated using (true);

drop policy if exists own_vehicle_tariffs_staff on public.own_vehicle_tariffs;
create policy own_vehicle_tariffs_staff on public.own_vehicle_tariffs
  for all to authenticated using (public.is_staff()) with check (public.is_staff());

drop policy if exists own_vehicle_tariffs_read on public.own_vehicle_tariffs;
create policy own_vehicle_tariffs_read on public.own_vehicle_tariffs
  for select to anon, authenticated using (true);

insert into public.own_vehicle_categories (code, label, capacity_pol, sort_order, active)
values
  ('motorcycle', 'Motocicleta', 12, 10, true),
  ('car', 'Carro', 48, 20, true)
on conflict (code) do nothing;

-- Tarifas seed: valores 0 até eFe configurar (sem preço comercial inventado)
insert into public.own_vehicle_tariffs (category_id, tarifa_minima, valor_por_km, active, version)
select c.id, 0, 0, false, 1
from public.own_vehicle_categories c
where c.code in ('motorcycle', 'car')
  and not exists (
    select 1 from public.own_vehicle_tariffs t where t.category_id = c.id
  );

-- ---------------------------------------------------------------------------
-- 3) Perfil logístico no produto
-- ---------------------------------------------------------------------------
alter table public.products add column if not exists pol_unit numeric(10, 2);
alter table public.products add column if not exists logistic_porte text;
alter table public.products add column if not exists vehicle_min_code text;
alter table public.products add column if not exists compatible_vehicle_codes text[] default '{}'::text[];
alter table public.products add column if not exists logistic_restrictions jsonb default '[]'::jsonb;
alter table public.products add column if not exists own_delivery_allowed boolean not null default true;
alter table public.products add column if not exists pol_origin text not null default 'global';
alter table public.products add column if not exists logistic_profile_origin text not null default 'global';

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'products_logistic_porte_chk') then
    alter table public.products
      add constraint products_logistic_porte_chk
      check (logistic_porte is null or logistic_porte in ('pequeno', 'medio', 'grande'));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'products_pol_origin_chk') then
    alter table public.products
      add constraint products_pol_origin_chk
      check (pol_origin in ('manual', 'global'));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'products_logistic_profile_origin_chk') then
    alter table public.products
      add constraint products_logistic_profile_origin_chk
      check (logistic_profile_origin in ('manual', 'global'));
  end if;
end $$;

comment on column public.products.pol_unit is 'POL unitário frete próprio v2. Null = perfil incompleto.';
comment on column public.products.own_delivery_allowed is 'Elegível a frete próprio FAL.';

-- ---------------------------------------------------------------------------
-- 4) Cache de distância rodoviária (ida)
-- ---------------------------------------------------------------------------
create table if not exists public.own_route_distance_cache (
  id uuid primary key default gen_random_uuid(),
  address_hash text not null unique,
  origin_postal_code text not null,
  dest_postal_code text not null,
  dest_number text not null,
  distance_km numeric(12, 3) not null,
  provider text not null default 'google_routes',
  raw_meta jsonb,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

create index if not exists own_route_distance_cache_expires_idx
  on public.own_route_distance_cache (expires_at);

alter table public.own_route_distance_cache enable row level security;

drop policy if exists own_route_cache_staff on public.own_route_distance_cache;
create policy own_route_cache_staff on public.own_route_distance_cache
  for all to authenticated using (public.is_staff()) with check (public.is_staff());

-- service_role bypassa RLS; Edge grava com service key.

-- ---------------------------------------------------------------------------
-- 5) Cotações own v2 (provider=own na shipping_quotes)
-- option_id loja: ownq:<quote_uuid>:<vehicle_code>
-- ---------------------------------------------------------------------------
-- shipping_quotes já existe (ME). Reusar com provider='own'.

create or replace function public.resolve_own_quote_shipping_option(
  p_option_id text,
  p_customer_id uuid,
  p_postal_code text
)
returns table (
  option_id text,
  provider text,
  service_code text,
  label text,
  amount numeric,
  eta_days_min int,
  eta_days_max int,
  quote_id uuid,
  vehicle_code text,
  option_meta jsonb
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_parts text[];
  v_quote_id uuid;
  v_vehicle text;
  v_quote public.shipping_quotes%rowtype;
  v_opt jsonb;
  v_cep text := regexp_replace(coalesce(p_postal_code, ''), '\D', '', 'g');
begin
  if p_option_id is null or p_option_id not like 'ownq:%' then
    raise exception 'Opção frete próprio v2 inválida: %', p_option_id using errcode = 'P0001';
  end if;
  v_parts := string_to_array(p_option_id, ':');
  if array_length(v_parts, 1) < 3 then
    raise exception 'Formato ownq inválido: %', p_option_id using errcode = 'P0001';
  end if;
  begin
    v_quote_id := (v_parts[2])::uuid;
  exception when others then
    raise exception 'quote_id inválido em %', p_option_id using errcode = 'P0001';
  end;
  v_vehicle := v_parts[3];

  select * into v_quote from public.shipping_quotes q where q.id = v_quote_id for update;
  if not found then
    raise exception 'Cotação frete próprio não encontrada' using errcode = 'P0001';
  end if;
  if v_quote.provider is distinct from 'own' then
    raise exception 'Cotação não é frete próprio' using errcode = 'P0001';
  end if;
  if v_quote.consumed_at is not null then
    raise exception 'Cotação frete próprio já consumida' using errcode = 'P0001';
  end if;
  if v_quote.expires_at <= now() then
    raise exception 'Cotação frete próprio expirada' using errcode = 'P0001';
  end if;
  if v_quote.customer_id is not null and v_quote.customer_id is distinct from p_customer_id then
    raise exception 'Cotação frete próprio de outro cliente' using errcode = 'P0001';
  end if;
  if regexp_replace(coalesce(v_quote.postal_code, ''), '\D', '', 'g') is distinct from v_cep then
    raise exception 'CEP da cotação própria não confere' using errcode = 'P0001';
  end if;

  select o into v_opt
  from jsonb_array_elements(v_quote.options) o
  where o->>'vehicle_code' = v_vehicle
  limit 1;

  if v_opt is null then
    raise exception 'Veículo % não está na cotação própria', v_vehicle using errcode = 'P0001';
  end if;

  option_id := p_option_id;
  provider := 'own';
  service_code := v_vehicle;
  label := coalesce(v_opt->>'label', 'Entrega FAL');
  amount := coalesce((v_opt->>'amount')::numeric, 0);
  eta_days_min := coalesce((v_opt->>'eta_days_min')::int, 1);
  eta_days_max := coalesce((v_opt->>'eta_days_max')::int, 3);
  quote_id := v_quote.id;
  vehicle_code := v_vehicle;
  option_meta := v_opt;
  return next;
end;
$$;

revoke all on function public.resolve_own_quote_shipping_option(text, uuid, text) from public;
grant execute on function public.resolve_own_quote_shipping_option(text, uuid, text) to authenticated;
grant execute on function public.resolve_own_quote_shipping_option(text, uuid, text) to service_role;

-- ---------------------------------------------------------------------------
-- 6) Cobertura CEP helper (se ainda não existir no wtbp)
-- ---------------------------------------------------------------------------
create or replace function public.own_delivery_cep_in_coverage(p_postal_code text)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_cep text := regexp_replace(coalesce(p_postal_code, ''), '\D', '', 'g');
  v_ranges jsonb;
  v_r jsonb;
  v_from text;
  v_to text;
  v_enabled boolean;
begin
  select enabled, cep_ranges into v_enabled, v_ranges
  from public.store_own_delivery_settings
  limit 1;
  if not found or v_enabled is not true then
    return false;
  end if;
  if length(v_cep) <> 8 then
    return false;
  end if;
  for v_r in select * from jsonb_array_elements(coalesce(v_ranges, '[]'::jsonb))
  loop
    v_from := regexp_replace(coalesce(v_r->>'from', ''), '\D', '', 'g');
    v_to := regexp_replace(coalesce(v_r->>'to', ''), '\D', '', 'g');
    if length(v_from) = 8 and length(v_to) = 8 and v_cep >= v_from and v_cep <= v_to then
      return true;
    end if;
  end loop;
  return false;
end;
$$;

revoke all on function public.own_delivery_cep_in_coverage(text) from public;
grant execute on function public.own_delivery_cep_in_coverage(text) to anon, authenticated, service_role;

-- ---------------------------------------------------------------------------
-- 7) resolve_mock: garantir branch own: flat (v1)
-- ---------------------------------------------------------------------------
create or replace function public.resolve_mock_shipping_option(
  p_option_id text,
  p_postal_code text
)
returns table (
  option_id text,
  provider text,
  service_code text,
  label text,
  amount numeric,
  eta_days_min int,
  eta_days_max int
)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_cep text := regexp_replace(coalesce(p_postal_code, ''), '\D', '', 'g');
  v_first text;
  v_surcharge numeric := 0;
  v_settings public.store_own_delivery_settings%rowtype;
  v_rate jsonb;
begin
  if p_option_id like 'own:%' and p_option_id not like 'ownq:%' then
    select * into v_settings from public.store_own_delivery_settings limit 1;
    if not found or v_settings.enabled is not true then
      raise exception 'Frete próprio desativado' using errcode = 'P0001';
    end if;
    if not public.own_delivery_cep_in_coverage(v_cep) then
      raise exception 'CEP fora da cobertura do frete próprio' using errcode = 'P0001';
    end if;
    select r into v_rate
    from jsonb_array_elements(coalesce(v_settings.rates, '[]'::jsonb)) r
    where r->>'id' = p_option_id
    limit 1;
    if v_rate is null then
      raise exception 'Modalidade frete próprio inválida: %', p_option_id using errcode = 'P0001';
    end if;
    option_id := p_option_id;
    provider := 'own';
    service_code := coalesce(v_rate->>'serviceCode', 'fal_sp');
    label := coalesce(v_rate->>'label', 'Entrega FAL');
    amount := coalesce((v_rate->>'amount')::numeric, 0);
    eta_days_min := coalesce((v_rate->>'etaDaysMin')::int, 1);
    eta_days_max := coalesce((v_rate->>'etaDaysMax')::int, 3);
    return next;
    return;
  end if;

  v_first := substr(v_cep, 1, 1);
  if v_first in ('4', '5', '6') then v_surcharge := 5;
  elsif v_first in ('7', '8', '9') then v_surcharge := 10;
  end if;

  if p_option_id = 'mock:economic' then
    option_id := p_option_id; provider := 'mock'; service_code := 'economic';
    label := 'Entrega econômica'; amount := 29.9 + v_surcharge;
    eta_days_min := 5; eta_days_max := 8; return next; return;
  elsif p_option_id = 'mock:express' then
    option_id := p_option_id; provider := 'mock'; service_code := 'express';
    label := 'Entrega expressa'; amount := 49.9 + v_surcharge;
    eta_days_min := 2; eta_days_max := 4; return next; return;
  elsif p_option_id = 'mock:pickup' then
    option_id := p_option_id; provider := 'mock'; service_code := 'pickup';
    label := 'Retirada na loja'; amount := 0;
    eta_days_min := 0; eta_days_max := 1; return next; return;
  end if;

  raise exception 'Opção de frete inválida: %', p_option_id using errcode = 'P0001';
end;
$$;

-- ---------------------------------------------------------------------------
-- 8) Audit + manual reviews
-- ---------------------------------------------------------------------------
create table if not exists public.own_manual_reviews (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid references public.customers (id) on delete set null,
  order_id uuid references public.orders (id) on delete set null,
  status text not null default 'pending',
  reason text,
  pol_total numeric(12, 2),
  payload jsonb not null default '{}'::jsonb,
  authorized_amount numeric(12, 2),
  staff_note text,
  resolved_by uuid,
  resolved_at timestamptz,
  created_at timestamptz not null default now(),
  constraint own_manual_reviews_status_chk
    check (status in ('pending', 'approved', 'rejected', 'priced'))
);

create table if not exists public.own_admin_audit_log (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid,
  action text not null,
  entity text not null,
  entity_id text,
  before_data jsonb,
  after_data jsonb,
  created_at timestamptz not null default now()
);

alter table public.own_manual_reviews enable row level security;
alter table public.own_admin_audit_log enable row level security;

drop policy if exists own_manual_reviews_staff on public.own_manual_reviews;
create policy own_manual_reviews_staff on public.own_manual_reviews
  for all to authenticated using (public.is_staff()) with check (public.is_staff());

drop policy if exists own_admin_audit_staff on public.own_admin_audit_log;
create policy own_admin_audit_staff on public.own_admin_audit_log
  for all to authenticated using (public.is_staff()) with check (public.is_staff());
