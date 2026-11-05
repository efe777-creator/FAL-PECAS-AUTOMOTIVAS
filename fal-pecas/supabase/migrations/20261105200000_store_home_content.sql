-- Onda 3 itens 09/10: campanhas (banners) e destaques curados na Home.

create table if not exists public.store_home_banners (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  subtitle text not null default '',
  cta_label text not null default 'Ver catálogo',
  href text not null default '/catalogo',
  image_src text,
  tone text not null default 'navy'
    check (tone in ('navy', 'steel', 'sand')),
  sort_order integer not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists store_home_banners_active_sort_idx
  on public.store_home_banners (active, sort_order, created_at);

create table if not exists public.store_home_featured_products (
  product_id uuid primary key references public.products (id) on delete cascade,
  sort_order integer not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists store_home_featured_products_active_sort_idx
  on public.store_home_featured_products (active, sort_order);

alter table public.store_home_banners enable row level security;
alter table public.store_home_featured_products enable row level security;

drop policy if exists store_home_banners_public_read on public.store_home_banners;
create policy store_home_banners_public_read on public.store_home_banners
  for select to anon, authenticated
  using (active = true);

drop policy if exists store_home_banners_staff_all on public.store_home_banners;
create policy store_home_banners_staff_all on public.store_home_banners
  for all to authenticated
  using (public.is_staff())
  with check (public.is_staff());

drop policy if exists store_home_featured_public_read on public.store_home_featured_products;
create policy store_home_featured_public_read on public.store_home_featured_products
  for select to anon, authenticated
  using (active = true);

drop policy if exists store_home_featured_staff_all on public.store_home_featured_products;
create policy store_home_featured_staff_all on public.store_home_featured_products
  for all to authenticated
  using (public.is_staff())
  with check (public.is_staff());

grant select on public.store_home_banners to anon, authenticated;
grant select, insert, update, delete on public.store_home_banners to authenticated;

grant select on public.store_home_featured_products to anon, authenticated;
grant select, insert, update, delete on public.store_home_featured_products to authenticated;

-- Seed inicial (só se vazio) — espelha homeBanners.ts
insert into public.store_home_banners (title, subtitle, cta_label, href, image_src, tone, sort_order, active)
select *
from (
  values
    (
      'Suspensão pronta para o dia a dia',
      'Amortecedores, bandejas e buchas com aplicação certa.',
      'Ver suspensão',
      '/catalogo?cat=suspensao',
      '/icons/categories/suspensao.png',
      'navy',
      10,
      true
    ),
    (
      'Freios com segurança em primeiro lugar',
      'Pastilhas, discos e componentes para parar bem.',
      'Ver freios',
      '/catalogo?cat=freios',
      '/icons/categories/freios.png',
      'steel',
      20,
      true
    ),
    (
      'Filtros para manter o motor limpo',
      'Óleo, ar e combustível — troque no tempo certo.',
      'Ver filtros',
      '/catalogo?cat=filtros',
      '/icons/categories/filtros.png',
      'sand',
      30,
      true
    )
) as v(title, subtitle, cta_label, href, image_src, tone, sort_order, active)
where not exists (select 1 from public.store_home_banners limit 1);
