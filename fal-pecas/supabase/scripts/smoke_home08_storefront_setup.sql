-- Setup temporário smoke storefront TDI1006 (não limpa — usar cleanup depois).

do $$
declare
  v_pid uuid := '50269e74-7ef8-4393-9f63-2e55741d9b04';
  v_promo_list uuid := 'a1111111-1111-1111-1111-111111111102';
  v_promo_id uuid;
  v_amount numeric;
  v_slug text;
begin
  update public.price_lists
  set status = 'active', updated_at = now()
  where id = v_promo_list;

  insert into public.price_list_items (price_list_id, product_id, price)
  values (v_promo_list, v_pid, 40.00)
  on conflict (price_list_id, product_id)
  do update set price = excluded.price;

  select id into v_promo_id
  from public.product_promotions
  where product_id = v_pid and status = 'active'
  limit 1;

  if v_promo_id is null then
    select id into v_promo_id
    from public.product_promotions
    where product_id = v_pid
    order by updated_at desc
    limit 1;
  end if;

  if v_promo_id is null then
    insert into public.product_promotions (product_id, price_list_id, status)
    values (v_pid, v_promo_list, 'active')
    returning id into v_promo_id;
  else
    update public.product_promotions
    set status = 'active',
        price_list_id = v_promo_list,
        starts_at = null,
        ends_at = null,
        updated_at = now()
    where id = v_promo_id;
  end if;

  insert into public.product_promotion_events (
    product_promotion_id, product_id, price_list_id, action, meta
  ) values (
    v_promo_id, v_pid, v_promo_list, 'activate',
    jsonb_build_object('smoke', 'home08-storefront')
  );

  select r.amount, r.price_list_slug into v_amount, v_slug
  from public.resolve_product_price(v_pid, null, now()) r;

  if v_amount is distinct from 40.00 or v_slug is distinct from 'promocional' then
    raise exception 'SETUP FAIL: expected 40/promocional got %/%', v_amount, v_slug;
  end if;

  raise notice 'SETUP_OK amount=% slug=% promo_id=%', v_amount, v_slug, v_promo_id;
end $$;

select amount, price_list_slug
from resolve_product_price('50269e74-7ef8-4393-9f63-2e55741d9b04', null, now());
