-- Favoritos da conta: lê metadados do produto mesmo se arquivado
-- (products_public_read só libera published — join normal some com null).

create or replace function public.store_list_my_favorites()
returns table (
  product_id uuid,
  created_at timestamptz,
  sku text,
  commercial_ref text,
  name text,
  slug text,
  price numeric,
  promo_price numeric,
  status text,
  is_available boolean,
  brand_id uuid,
  category_id uuid,
  brand_name text,
  product_kind text
)
language sql
stable
security definer
set search_path = public
as $$
  select
    f.product_id,
    f.created_at,
    p.sku,
    p.commercial_ref,
    p.name,
    p.slug,
    p.price,
    p.promo_price,
    p.status,
    p.is_available,
    p.brand_id,
    p.category_id,
    pb.name as brand_name,
    p.product_kind::text
  from public.favorites f
  left join public.products p on p.id = f.product_id
  left join public.product_brands pb on pb.id = p.brand_id
  where f.user_id = auth.uid()
  order by f.created_at desc;
$$;

revoke all on function public.store_list_my_favorites() from public;
grant execute on function public.store_list_my_favorites() to authenticated;

comment on function public.store_list_my_favorites() is
  'Conta: lista favoritos do usuário com metadados do produto (inclui arquivados).';
