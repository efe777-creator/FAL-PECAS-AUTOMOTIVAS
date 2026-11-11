-- CP-CAN-POST: bloquear approve de cancel comercial após despacho/entrega.
-- Recusar solicitação continua permitido (orienta pós-venda).

create or replace function public.admin_resolve_order_cancellation(
  p_order_id uuid,
  p_approve boolean,
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
  v_note text := nullif(trim(coalesce(p_note, '')), '');
  v_rows int;
begin
  if v_uid is null or not public.is_staff() then
    raise exception 'Apenas staff' using errcode = '42501';
  end if;

  select * into v_order
  from public.orders
  where id = p_order_id
  for update;

  if not found then
    raise exception 'Pedido nao encontrado' using errcode = 'P0001';
  end if;

  if v_order.cancellation_request is distinct from 'pending' then
    raise exception 'Nao ha solicitacao pendente' using errcode = 'P0001';
  end if;

  -- CP-CAN-POST
  if p_approve and v_order.status in ('enviado', 'entregue') then
    raise exception
      'Pedido ja despachado/entregue — use ocorrencia/pos-venda, nao cancelamento comercial'
      using errcode = 'P0001';
  end if;

  if p_approve then
    perform public.release_order_reservations(p_order_id);

    update public.orders
    set
      status = 'cancelado',
      cancellation_request = 'approved',
      cancellation_resolved_at = now(),
      cancellation_resolve_note = coalesce(
        v_note,
        'Cancelamento aprovado — estorno MANUAL pendente no MP'
      ),
      updated_at = now()
    where id = p_order_id
      and cancellation_request = 'pending';

    get diagnostics v_rows = row_count;
    if v_rows = 0 then
      raise exception 'Falha ao aprovar cancelamento' using errcode = 'P0001';
    end if;

    update public.shipments
    set status = 'cancelled'
    where order_id = p_order_id
      and status is distinct from 'cancelled';

    insert into public.order_status_history (order_id, status, note, changed_by)
    values (
      p_order_id,
      'cancelado',
      'Cancelamento pos-pago APROVADO — estorno MANUAL (MP). '
        || coalesce(v_note, ''),
      v_uid
    );

    perform public.emit_order_event(
      p_order_id,
      'cancellation_approved',
      'customer',
      jsonb_build_object(
        'note', v_note,
        'refund_policy', 'manual',
        'refund_status', 'pending_operator'
      ),
      v_uid
    );

    return jsonb_build_object(
      'order_id', p_order_id,
      'status', 'cancelado',
      'cancellation_request', 'approved',
      'refund_policy', 'manual',
      'refund_status', 'pending_operator'
    );
  end if;

  update public.orders
  set
    cancellation_request = 'rejected',
    cancellation_resolved_at = now(),
    cancellation_resolve_note = coalesce(v_note, 'Solicitacao recusada pela loja'),
    updated_at = now()
  where id = p_order_id
    and cancellation_request = 'pending';

  get diagnostics v_rows = row_count;
  if v_rows = 0 then
    raise exception 'Falha ao recusar cancelamento' using errcode = 'P0001';
  end if;

  insert into public.order_status_history (order_id, status, note, changed_by)
  values (
    p_order_id,
    v_order.status,
    'Solicitacao de cancelamento RECUSADA. ' || coalesce(v_note, ''),
    v_uid
  );

  perform public.emit_order_event(
    p_order_id,
    'cancellation_rejected',
    'customer',
    jsonb_build_object('note', v_note),
    v_uid
  );

  return jsonb_build_object(
    'order_id', p_order_id,
    'status', v_order.status,
    'cancellation_request', 'rejected',
    'refund_policy', 'manual'
  );
end;
$$;

comment on function public.admin_resolve_order_cancellation(uuid, boolean, text) is
  'Staff aprova/recusa cancel pos-pago. CP-CAN-POST: approve bloqueado se enviado/entregue.';

revoke all on function public.admin_resolve_order_cancellation(uuid, boolean, text) from public;
grant execute on function public.admin_resolve_order_cancellation(uuid, boolean, text) to authenticated;
