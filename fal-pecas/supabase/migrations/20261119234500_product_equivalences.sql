-- E.6: equivalentes técnicos (distinto de product_related_links comerciais).
-- Vínculo bidirecional via pares espelhados; sem transitividade.

create table if not exists public.product_equivalences (
  product_id uuid not null references public.products (id) on delete cascade,
  equivalent_product_id uuid not null references public.products (id) on delete cascade,
  evidence text not null default 'cadastro_interno_fal',
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (product_id, equivalent_product_id),
  constraint product_equivalences_no_self check (product_id <> equivalent_product_id)
);

create index if not exists product_equivalences_product_active_idx
  on public.product_equivalences (product_id, active);

create index if not exists product_equivalences_equivalent_idx
  on public.product_equivalences (equivalent_product_id);

comment on table public.product_equivalences is
  'E.6: equivalentes técnicos produto↔produto (bidirecional). Não confundir com product_related_links (curadoria comercial PDP).';
comment on column public.product_equivalences.evidence is
  'Origem da equivalência; default cadastro_interno_fal.';

alter table public.product_equivalences enable row level security;

drop policy if exists product_equivalences_public_read on public.product_equivalences;
create policy product_equivalences_public_read on public.product_equivalences
  for select to anon, authenticated
  using (active = true);

drop policy if exists product_equivalences_staff_all on public.product_equivalences;
create policy product_equivalences_staff_all on public.product_equivalences
  for all to authenticated
  using (public.is_staff())
  with check (public.is_staff());

grant select on public.product_equivalences to anon, authenticated;
grant select, insert, update, delete on public.product_equivalences to authenticated;
