-- Marcha 8 / G8: frete cobrado vs custo efetivo em shipments.metadata.finance

create or replace function public.admin_set_shipment_freight_cost(
  p_order_id uuid,
  p_effective_cost numeric,
  p_cost_source text default 'manual',
  p_note text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_order public.orders%rowtype;
  v_ship public.shipments%rowtype;
  v_charged numeric;
  v_source text := coalesce(nullif(trim(p_cost_source), ''), 'manual');
  v_finance jsonb;
  v_meta jsonb;
begin
  if v_uid is null or not public.is_staff() then
    raise exception 'Apenas staff' using errcode = '42501';
  end if;

  if p_effective_cost is null or p_effective_cost < 0 then
    raise exception 'effective_cost invalido' using errcode = 'P0001';
  end if;

  if v_source not in ('me_label', 'own_ops', 'manual') then
    raise exception 'cost_source invalido' using errcode = 'P0001';
  end if;

  select * into v_order from public.orders where id = p_order_id for update;
  if not found then
    raise exception 'Pedido nao encontrado' using errcode = 'P0001';
  end if;

  v_charged := coalesce(v_order.shipping_amount, 0);

  select * into v_ship
  from public.shipments
  where order_id = p_order_id
  order by created_at asc nulls last, id asc
  limit 1
  for update;

  if not found then
    raise exception 'Shipment ausente' using errcode = 'P0001';
  end if;

  v_finance := jsonb_build_object(
    'charged_shipping', round(v_charged::numeric, 2),
    'effective_cost', round(p_effective_cost::numeric, 2),
    'cost_source', v_source,
    'delta', round((v_charged - p_effective_cost)::numeric, 2),
    'recorded_at', now(),
    'recorded_by', v_uid,
    'note', nullif(trim(coalesce(p_note, '')), '')
  );

  v_meta := jsonb_set(coalesce(v_ship.metadata, '{}'::jsonb), '{finance}', v_finance, true);

  update public.shipments
  set metadata = v_meta,
      amount = round(p_effective_cost::numeric, 2)
  where id = v_ship.id;

  perform public.emit_order_event(
    p_order_id,
    'freight_finance_updated',
    'internal',
    v_finance,
    v_uid
  );

  return jsonb_build_object(
    'order_id', p_order_id,
    'shipment_id', v_ship.id,
    'finance', v_finance,
    'g8_complete', true
  );
end;
$$;

comment on function public.admin_set_shipment_freight_cost(uuid, numeric, text, text) is
  'Marcha 8: registra custo efetivo do frete (G8) em metadata.finance.';

revoke all on function public.admin_set_shipment_freight_cost(uuid, numeric, text, text) from public;
grant execute on function public.admin_set_shipment_freight_cost(uuid, numeric, text, text) to authenticated;
