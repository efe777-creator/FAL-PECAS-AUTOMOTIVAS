-- G6: ao inserir order_items, congela snapshot a partir do cart_items (se ainda não veio no NEW).
-- Evita reescrever place_order_core_hybrid inteiro; cart é a fonte no momento do pedido.

create or replace function public.order_items_freeze_vehicle_snapshot()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_customer_id uuid;
  v_cart_id uuid;
  v_cv_id uuid;
  v_snap jsonb;
begin
  if new.vehicle_snapshot is not null then
    return new;
  end if;

  select o.customer_id into v_customer_id
  from public.orders o
  where o.id = new.order_id;

  if v_customer_id is null then
    return new;
  end if;

  select c.id into v_cart_id
  from public.carts c
  where c.customer_id = v_customer_id;

  if v_cart_id is null then
    return new;
  end if;

  select ci.customer_vehicle_id, ci.vehicle_snapshot
    into v_cv_id, v_snap
  from public.cart_items ci
  where ci.cart_id = v_cart_id
    and ci.product_id = new.product_id
  limit 1;

  if v_snap is not null then
    new.vehicle_snapshot := v_snap;
    if new.customer_vehicle_id is null then
      new.customer_vehicle_id := v_cv_id;
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists order_items_freeze_vehicle_snapshot_trg on public.order_items;
create trigger order_items_freeze_vehicle_snapshot_trg
  before insert on public.order_items
  for each row
  execute function public.order_items_freeze_vehicle_snapshot();

comment on function public.order_items_freeze_vehicle_snapshot() is
  'G6: copia vehicle_snapshot/customer_vehicle_id do cart_items no insert do pedido (imutável depois).';

-- Também patch cirúrgico em place_order_core_hybrid (payload + cart agg).
do $patch$
declare
  src text;
begin
  src := pg_get_functiondef('public.place_order_core_hybrid(jsonb)'::regprocedure);

  if position('vehicle_snapshot'', ci.vehicle_snapshot)' in src) = 0 then
    src := replace(
      src,
      'jsonb_agg(jsonb_build_object(''product_id'', ci.product_id, ''quantity'', ci.quantity))',
      'jsonb_agg(jsonb_build_object(''product_id'', ci.product_id, ''quantity'', ci.quantity, ''customer_vehicle_id'', ci.customer_vehicle_id, ''vehicle_snapshot'', ci.vehicle_snapshot))'
    );
  end if;

  if position('nullif(v_item ->> ''customer_vehicle_id''' in src) = 0 then
    src := replace(
      src,
      'insert into public.order_items (
      order_id, product_id, sku, name_snapshot, unit_price, quantity, price_list_id
    )
    values (v_order_id, v_product_id, v_sku, v_name, v_unit, v_qty, v_price_list_id);',
      'insert into public.order_items (
      order_id, product_id, sku, name_snapshot, unit_price, quantity, price_list_id,
      customer_vehicle_id, vehicle_snapshot
    )
    values (
      v_order_id, v_product_id, v_sku, v_name, v_unit, v_qty, v_price_list_id,
      nullif(v_item ->> ''customer_vehicle_id'', '''')::uuid,
      case
        when jsonb_typeof(v_item -> ''vehicle_snapshot'') = ''object'' then v_item -> ''vehicle_snapshot''
        else null
      end
    );'
    );
  end if;

  execute src;
end;
$patch$;
