-- Gate Opção A: item na lista promo SEM product_promotions active → Base.
-- Cleanup no final.

do $$
declare
  v_pid uuid := '50269e74-7ef8-4393-9f63-2e55741d9b04';
  v_promo_list uuid := 'a1111111-1111-1111-1111-111111111102';
  v_amount numeric;
  v_slug text;
begin
  update public.price_lists set status = 'active', updated_at = now() where id = v_promo_list;

  insert into public.price_list_items (price_list_id, product_id, price)
  values (v_promo_list, v_pid, 40.00)
  on conflict (price_list_id, product_id) do update set price = excluded.price;

  update public.product_promotions
  set status = 'inactive', updated_at = now()
  where product_id = v_pid and status = 'active';

  select r.amount, r.price_list_slug into v_amount, v_slug
  from public.resolve_product_price(v_pid, null, now()) r;

  if v_amount is distinct from 47.25 or v_slug is distinct from 'preco-base' then
    raise exception 'GATE FAIL: expected Base 47.25 got %/%', v_amount, v_slug;
  end if;

  delete from public.price_list_items where price_list_id = v_promo_list and product_id = v_pid;
  update public.price_lists set status = 'inactive', updated_at = now() where id = v_promo_list;

  raise notice 'GATE_ITEM_WITHOUT_PROMO_PASS';
end $$;

select amount, price_list_slug
from resolve_product_price('50269e74-7ef8-4393-9f63-2e55741d9b04', null, now());
