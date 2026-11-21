-- Home widget: ranking de mais vendidos (agregação pública, sem PII).
-- Conta quantidade em order_items de pedidos pós-pagamento (exclui pendente/cancelado).

create or replace function public.store_bestseller_product_ids(
  p_limit int default 12,
  p_days int default 90
)
returns table (product_id uuid, units_sold bigint)
language sql
stable
security definer
set search_path = public
as $$
  with sold as (
    select
      oi.product_id,
      sum(oi.quantity)::bigint as units_sold
    from public.order_items oi
    inner join public.orders o on o.id = oi.order_id
    where oi.product_id is not null
      and o.created_at >= (now() - make_interval(days => greatest(p_days, 1)))
      and o.status not in (
        'pendente',
        'aguardando_pagamento',
        'cancelado',
        'expirado'
      )
    group by oi.product_id
  )
  select s.product_id, s.units_sold
  from sold s
  inner join public.products p on p.id = s.product_id
  where p.status = 'published'
  order by s.units_sold desc, s.product_id
  limit greatest(1, least(coalesce(p_limit, 12), 48));
$$;

revoke all on function public.store_bestseller_product_ids(int, int) from public;
grant execute on function public.store_bestseller_product_ids(int, int) to anon, authenticated;

comment on function public.store_bestseller_product_ids(int, int) is
  'Home: top product_ids por unidades vendidas (pedidos pós-pagamento, janela em dias).';
