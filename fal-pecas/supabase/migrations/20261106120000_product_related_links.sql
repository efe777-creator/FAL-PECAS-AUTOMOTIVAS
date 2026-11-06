-- Onda 4 item 26: relacionados curados na PDP (com fallback por categoria).

create table if not exists public.product_related_links (
  product_id uuid not null references public.products (id) on delete cascade,
  related_product_id uuid not null references public.products (id) on delete cascade,
  sort_order integer not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (product_id, related_product_id),
  constraint product_related_links_no_self check (product_id <> related_product_id)
);

create index if not exists product_related_links_product_active_sort_idx
  on public.product_related_links (product_id, active, sort_order);

create index if not exists product_related_links_related_idx
  on public.product_related_links (related_product_id);

alter table public.product_related_links enable row level security;

drop policy if exists product_related_links_public_read on public.product_related_links;
create policy product_related_links_public_read on public.product_related_links
  for select to anon, authenticated
  using (active = true);

drop policy if exists product_related_links_staff_all on public.product_related_links;
create policy product_related_links_staff_all on public.product_related_links
  for all to authenticated
  using (public.is_staff())
  with check (public.is_staff());

grant select on public.product_related_links to anon, authenticated;
grant select, insert, update, delete on public.product_related_links to authenticated;
