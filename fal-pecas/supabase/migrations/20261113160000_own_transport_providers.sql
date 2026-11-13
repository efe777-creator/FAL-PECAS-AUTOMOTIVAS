-- Prestadores de frete próprio (Uber/99/…) cadastráveis em Logística.

create table if not exists public.own_transport_providers (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  label text not null,
  active boolean not null default true,
  sort_order int not null default 100,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.own_transport_providers is
  'Modalidades/prestadores para despacho frete próprio (ops).';

insert into public.own_transport_providers (slug, label, active, sort_order)
values
  ('uber', 'Uber', true, 10),
  ('99', '99', true, 20),
  ('lalamove', 'Lalamove', true, 30),
  ('motoboy_fal', 'Motoboy FAL', true, 40),
  ('van_fal', 'Van / frota FAL', true, 50),
  ('outro', 'Outro / terceirizado', true, 90)
on conflict (slug) do nothing;

alter table public.own_transport_providers enable row level security;

drop policy if exists own_transport_providers_staff_all on public.own_transport_providers;
create policy own_transport_providers_staff_all
  on public.own_transport_providers
  for all
  to authenticated
  using (public.is_staff())
  with check (public.is_staff());

drop policy if exists own_transport_providers_read_active on public.own_transport_providers;
create policy own_transport_providers_read_active
  on public.own_transport_providers
  for select
  to authenticated
  using (active = true or public.is_staff());

grant select on public.own_transport_providers to authenticated;
grant insert, update, delete on public.own_transport_providers to authenticated;
