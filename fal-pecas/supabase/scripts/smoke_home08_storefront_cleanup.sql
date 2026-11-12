-- Cleanup smoke storefront TDI1006.

do $$
declare
  v_pid uuid := '50269e74-7ef8-4393-9f63-2e55741d9b04';
  v_promo_list uuid := 'a1111111-1111-1111-1111-111111111102';
begin
  update public.product_promotions
  set status = 'inactive', updated_at = now()
  where product_id = v_pid and status = 'active';

  delete from public.price_list_items
  where price_list_id = v_promo_list and product_id = v_pid;

  update public.price_lists
  set status = 'inactive', updated_at = now()
  where id = v_promo_list;
end $$;

select
  (select status from price_lists where id = 'a1111111-1111-1111-1111-111111111102') as lista_status,
  (select amount from resolve_product_price('50269e74-7ef8-4393-9f63-2e55741d9b04', null, now())) as resolve_amount,
  (select price_list_slug from resolve_product_price('50269e74-7ef8-4393-9f63-2e55741d9b04', null, now())) as resolve_slug;
