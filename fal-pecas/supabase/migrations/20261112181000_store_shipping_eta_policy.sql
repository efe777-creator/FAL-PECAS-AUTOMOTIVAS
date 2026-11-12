-- Marcha 1b: política de prazos dos meios — fonte única na Logística.

create table if not exists public.store_shipping_eta_policy (
  id uuid primary key default gen_random_uuid(),
  day_count_mode text not null default 'business_days'
    check (day_count_mode in ('business_days', 'calendar_days')),
  me_prep_days int not null default 1 check (me_prep_days >= 0),
  me_buffer_days int not null default 0 check (me_buffer_days >= 0),
  me_prep_included_in_carrier boolean not null default false,
  own_day_count_mode text not null default 'business_days'
    check (own_day_count_mode in ('business_days', 'calendar_days')),
  mock_economic_min int not null default 5 check (mock_economic_min >= 0),
  mock_economic_max int not null default 8 check (mock_economic_max >= 0),
  mock_express_min int not null default 2 check (mock_express_min >= 0),
  mock_express_max int not null default 4 check (mock_express_max >= 0),
  pickup_days_min int not null default 0 check (pickup_days_min >= 0),
  pickup_days_max int not null default 1 check (pickup_days_max >= 0),
  updated_at timestamptz not null default now(),
  updated_by uuid,
  constraint store_shipping_eta_policy_mock_econ_chk check (mock_economic_max >= mock_economic_min),
  constraint store_shipping_eta_policy_mock_exp_chk check (mock_express_max >= mock_express_min),
  constraint store_shipping_eta_policy_pickup_chk check (pickup_days_max >= pickup_days_min)
);

create unique index if not exists store_shipping_eta_policy_singleton
  on public.store_shipping_eta_policy ((true));

alter table public.store_shipping_eta_policy enable row level security;

drop policy if exists store_shipping_eta_policy_staff on public.store_shipping_eta_policy;
create policy store_shipping_eta_policy_staff on public.store_shipping_eta_policy
  for all to authenticated
  using (public.is_staff())
  with check (public.is_staff());

drop policy if exists store_shipping_eta_policy_anon_read on public.store_shipping_eta_policy;
create policy store_shipping_eta_policy_anon_read on public.store_shipping_eta_policy
  for select to anon, authenticated
  using (true);

insert into public.store_shipping_eta_policy default values
where not exists (select 1 from public.store_shipping_eta_policy);

comment on table public.store_shipping_eta_policy is
  'Marcha 1b: prazos/políticas dos meios — editável só em Logística. Pedidos usam snapshot.';
