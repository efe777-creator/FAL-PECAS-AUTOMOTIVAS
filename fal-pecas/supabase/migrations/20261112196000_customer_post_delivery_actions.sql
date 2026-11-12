-- F2: cliente confirma recebimento ou reporta problema pós-entrega.

create or replace function public.customer_confirm_receipt(p_order_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_order public.orders%rowtype;
begin
  if v_uid is null then
    raise exception 'Nao autenticado' using errcode = '42501';
  end if;

  select * into v_order from public.orders where id = p_order_id for update;
  if not found then
    raise exception 'Pedido nao encontrado' using errcode = 'P0001';
  end if;

  if not exists (
    select 1 from public.customers c
    where c.id = v_order.customer_id and c.profile_id = v_uid
  ) then
    raise exception 'Pedido nao pertence ao usuario' using errcode = '42501';
  end if;

  if v_order.status is distinct from 'entregue' then
    raise exception 'So e possivel confirmar recebimento em pedido entregue'
      using errcode = 'P0001';
  end if;

  if exists (
    select 1 from public.order_events e
    where e.order_id = p_order_id and e.event_type = 'customer_receipt_confirmed'
  ) then
    return jsonb_build_object('order_id', p_order_id, 'status', v_order.status, 'already', true);
  end if;

  perform public.emit_order_event(
    p_order_id,
    'customer_receipt_confirmed',
    'customer',
    jsonb_build_object('confirmed_at', now()),
    v_uid
  );
  perform public.emit_order_event(
    p_order_id,
    'customer_receipt_confirmed',
    'internal',
    jsonb_build_object('confirmed_at', now()),
    v_uid
  );

  return jsonb_build_object('order_id', p_order_id, 'status', v_order.status, 'already', false);
end;
$$;

revoke all on function public.customer_confirm_receipt(uuid) from public;
grant execute on function public.customer_confirm_receipt(uuid) to authenticated;

create or replace function public.customer_report_delivery_issue(
  p_order_id uuid,
  p_reason text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_order public.orders%rowtype;
  v_reason text := nullif(trim(coalesce(p_reason, '')), '');
  v_occ uuid := gen_random_uuid();
begin
  if v_uid is null then
    raise exception 'Nao autenticado' using errcode = '42501';
  end if;
  if v_reason is null then
    raise exception 'Informe o problema' using errcode = 'P0001';
  end if;

  select * into v_order from public.orders where id = p_order_id for update;
  if not found then
    raise exception 'Pedido nao encontrado' using errcode = 'P0001';
  end if;

  if not exists (
    select 1 from public.customers c
    where c.id = v_order.customer_id and c.profile_id = v_uid
  ) then
    raise exception 'Pedido nao pertence ao usuario' using errcode = '42501';
  end if;

  if v_order.status not in ('enviado', 'entregue') then
    raise exception 'Reporte de problema so apos envio/entrega' using errcode = 'P0001';
  end if;

  perform public.emit_order_event(
    p_order_id,
    'occurrence_opened',
    'customer',
    jsonb_build_object(
      'occurrence_id', v_occ,
      'tipo', 'pos_entrega',
      'gravidade', 'media',
      'note', v_reason,
      'source', 'customer',
      'acao_necessaria', 'analisar_pos_venda'
    ),
    v_uid
  );
  perform public.emit_order_event(
    p_order_id,
    'occurrence_opened',
    'internal',
    jsonb_build_object(
      'occurrence_id', v_occ,
      'tipo', 'pos_entrega',
      'gravidade', 'media',
      'note', v_reason,
      'source', 'customer',
      'acao_necessaria', 'analisar_pos_venda'
    ),
    v_uid
  );

  return jsonb_build_object(
    'order_id', p_order_id,
    'occurrence_id', v_occ,
    'status', v_order.status
  );
end;
$$;

revoke all on function public.customer_report_delivery_issue(uuid, text) from public;
grant execute on function public.customer_report_delivery_issue(uuid, text) to authenticated;
