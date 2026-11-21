-- K13: devolução/reposição física pós-envio (itens e kits via snapshot).
-- Não inventa segundo motor: reutiliza expand_order_item_stock_lines.

alter table public.order_items
  add column if not exists quantity_restocked numeric(12, 3) not null default 0;

comment on column public.order_items.quantity_restocked is
  'K13: unidades comerciais já repostas ao estoque após envio (≤ quantity).';

create or replace function public.restock_order_item_physical(
  p_order_item_id uuid,
  p_qty numeric default null,
  p_note text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_item public.order_items%rowtype;
  v_order public.orders%rowtype;
  v_qty numeric(12, 3);
  v_remaining numeric(12, 3);
  v_r record;
  v_qty_int int;
  v_lines int := 0;
  v_note text := coalesce(nullif(trim(p_note), ''), 'order_return_physical');
begin
  if v_uid is null then
    raise exception 'Não autenticado' using errcode = '42501';
  end if;
  if not public.staff_can_adjust_inventory() then
    raise exception 'Sem permissão para repor estoque' using errcode = '42501';
  end if;

  select * into v_item from public.order_items where id = p_order_item_id for update;
  if not found then
    raise exception 'Item de pedido não encontrado' using errcode = 'P0001';
  end if;

  select * into v_order from public.orders where id = v_item.order_id for update;
  if not found then
    raise exception 'Pedido não encontrado' using errcode = 'P0001';
  end if;

  if v_order.status not in ('enviado', 'entregue') then
    raise exception 'Reposição física só após enviado/entregue (status atual: %)', v_order.status
      using errcode = 'P0001';
  end if;

  if v_item.product_id is null then
    raise exception 'Item sem product_id' using errcode = 'P0001';
  end if;

  v_remaining := v_item.quantity - coalesce(v_item.quantity_restocked, 0);
  if v_remaining <= 0 then
    raise exception 'Item já totalmente reposto' using errcode = 'P0001';
  end if;

  v_qty := coalesce(p_qty, v_remaining);
  if v_qty <= 0 then
    raise exception 'Quantidade de reposição inválida' using errcode = 'P0001';
  end if;
  if v_qty > v_remaining then
    raise exception 'Quantidade excede o restante a repor (%)', v_remaining
      using errcode = 'P0001';
  end if;

  for v_r in
    select * from public.expand_order_item_stock_lines(
      v_item.product_id,
      v_qty,
      v_item.kit_composition_snapshot
    )
  loop
    v_qty_int := round(v_r.stock_qty)::int;
    if v_qty_int <= 0 then
      continue;
    end if;

    insert into public.inventory (product_id, quantity_on_hand, quantity_reserved)
    values (v_r.stock_product_id, 0, 0)
    on conflict (product_id) do nothing;

    update public.inventory inv
    set quantity_on_hand = inv.quantity_on_hand + v_qty_int,
        updated_at = now()
    where inv.product_id = v_r.stock_product_id;

    insert into public.inventory_movements (product_id, type, quantity, reason, order_id, user_id)
    values (
      v_r.stock_product_id,
      'in',
      v_qty_int,
      v_note,
      v_item.order_id,
      v_uid
    );

    v_lines := v_lines + 1;
  end loop;

  if v_lines = 0 then
    raise exception 'Nenhuma linha de estoque para repor' using errcode = 'P0001';
  end if;

  update public.order_items
  set quantity_restocked = coalesce(quantity_restocked, 0) + v_qty
  where id = p_order_item_id;

  insert into public.order_events (order_id, event_type, payload, visibility, created_by)
  values (
    v_item.order_id,
    'inventory_restock_physical',
    jsonb_build_object(
      'order_item_id', p_order_item_id,
      'product_id', v_item.product_id,
      'qty', v_qty,
      'lines', v_lines,
      'note', v_note,
      'used_kit_snapshot', v_item.kit_composition_snapshot is not null
    ),
    'staff',
    v_uid
  );

  return jsonb_build_object(
    'order_item_id', p_order_item_id,
    'qty_restocked', v_qty,
    'qty_restocked_total', coalesce(v_item.quantity_restocked, 0) + v_qty,
    'stock_lines', v_lines
  );
end;
$$;

comment on function public.restock_order_item_physical(uuid, numeric, text) is
  'K13: reposição física pós-envio; kits usam kit_composition_snapshot (pedido imutável).';

revoke all on function public.restock_order_item_physical(uuid, numeric, text) from public;
grant execute on function public.restock_order_item_physical(uuid, numeric, text) to authenticated;
