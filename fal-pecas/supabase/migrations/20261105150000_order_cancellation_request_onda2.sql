-- M8 REGRAS-PEDIDOS-ONDA2
-- Solicitação de cancelamento pós-pagamento + análise admin.
-- Política provisória de estorno: MANUAL pelo operador (sem refund auto MP).
-- Assinatura comercial pode trocar para auto depois; não muda o fluxo de solicitação.

alter table public.orders
  add column if not exists cancellation_request text
    check (
      cancellation_request is null
      or cancellation_request in ('pending', 'approved', 'rejected')
    );

alter table public.orders
  add column if not exists cancellation_reason text;

alter table public.orders
  add column if not exists cancellation_requested_at timestamptz;

alter table public.orders
  add column if not exists cancellation_resolved_at timestamptz;

alter table public.orders
  add column if not exists cancellation_resolve_note text;

comment on column public.orders.cancellation_request is
  'Solicitação de cancelamento pós-pago: pending|approved|rejected';
comment on column public.orders.cancellation_reason is
  'Motivo informado pelo cliente na solicitação';
comment on column public.orders.cancellation_resolve_note is
  'Nota do operador ao aprovar/recusar; em approve lembrar estorno MANUAL';

-- ---------------------------------------------------------------------------
-- Cliente solicita cancelamento (pedido já pago / pós-pagamento)
-- ---------------------------------------------------------------------------
create or replace function public.request_order_cancellation(
  p_order_id uuid,
  p_reason text default null
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
begin
  if v_uid is null then
    raise exception 'Nao autenticado' using errcode = '42501';
  end if;

  select * into v_order
  from public.orders
  where id = p_order_id
  for update;

  if not found then
    raise exception 'Pedido nao encontrado' using errcode = 'P0001';
  end if;

  if not exists (
    select 1
    from public.customers c
    where c.id = v_order.customer_id
      and c.profile_id = v_uid
  ) then
    raise exception 'Pedido nao pertence ao usuario' using errcode = '42501';
  end if;

  if v_order.status in ('cancelado', 'enviado', 'entregue') then
    raise exception 'Nao e permitido solicitar cancelamento neste status'
      using errcode = 'P0001';
  end if;

  if v_order.status = 'aguardando_pagamento' then
    raise exception 'Use o cancelamento direto para pedidos nao pagos'
      using errcode = 'P0001';
  end if;

  if not exists (
    select 1 from public.payments p
    where p.order_id = p_order_id and p.status = 'approved'
  ) then
    raise exception 'Solicitacao pos-pago exige pagamento aprovado'
      using errcode = 'P0001';
  end if;

  if v_order.cancellation_request = 'pending' then
    raise exception 'Ja existe solicitacao de cancelamento pendente'
      using errcode = 'P0001';
  end if;

  if v_order.cancellation_request = 'approved' then
    raise exception 'Cancelamento ja foi aprovado' using errcode = 'P0001';
  end if;

  update public.orders
  set
    cancellation_request = 'pending',
    cancellation_reason = v_reason,
    cancellation_requested_at = now(),
    cancellation_resolved_at = null,
    cancellation_resolve_note = null,
    updated_at = now()
  where id = p_order_id;

  insert into public.order_status_history (order_id, status, note, changed_by)
  values (
    p_order_id,
    v_order.status,
    'Cliente solicitou cancelamento pos-pago'
      || case when v_reason is not null then (': ' || left(v_reason, 200)) else '' end,
    v_uid
  );

  perform public.emit_order_event(
    p_order_id,
    'cancellation_requested',
    'customer',
    jsonb_build_object(
      'reason', v_reason,
      'policy_refund', 'manual'
    ),
    v_uid
  );

  return jsonb_build_object(
    'order_id', p_order_id,
    'status', v_order.status,
    'cancellation_request', 'pending',
    'refund_policy', 'manual'
  );
end;
$$;

revoke all on function public.request_order_cancellation(uuid, text) from public;
grant execute on function public.request_order_cancellation(uuid, text) to authenticated;

comment on function public.request_order_cancellation(uuid, text) is
  'Cliente solicita cancelamento apos pagamento; fica pendente de analise. Estorno = manual (M8 provisório).';

-- ---------------------------------------------------------------------------
-- Staff resolve solicitação (aprova → cancela; rejeita → mantém pedido)
-- ---------------------------------------------------------------------------
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

    -- Pagamento approved permanece até o operador registrar refund no MP
    -- (política provisória manual). Não alterar payments.status aqui.

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

revoke all on function public.admin_resolve_order_cancellation(uuid, boolean, text) from public;
grant execute on function public.admin_resolve_order_cancellation(uuid, boolean, text) to authenticated;

comment on function public.admin_resolve_order_cancellation(uuid, boolean, text) is
  'Staff aprova (cancela + estorno manual) ou recusa solicitacao de cancelamento pos-pago.';

-- ---------------------------------------------------------------------------
-- Staff marca pagamento como refunded apos estorno no painel MP
-- ---------------------------------------------------------------------------
create or replace function public.admin_mark_payment_refunded(
  p_order_id uuid,
  p_note text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_note text := nullif(trim(coalesce(p_note, '')), '');
  v_rows int;
begin
  if v_uid is null or not public.is_staff() then
    raise exception 'Apenas staff' using errcode = '42501';
  end if;

  if not exists (select 1 from public.orders where id = p_order_id) then
    raise exception 'Pedido nao encontrado' using errcode = 'P0001';
  end if;

  update public.payments
  set
    status = 'refunded',
    updated_at = now()
  where order_id = p_order_id
    and status = 'approved';

  get diagnostics v_rows = row_count;
  if v_rows = 0 then
    raise exception 'Nenhum pagamento approved para marcar refunded'
      using errcode = 'P0001';
  end if;

  insert into public.order_status_history (order_id, status, note, changed_by)
  values (
    p_order_id,
    coalesce((select status from public.orders where id = p_order_id), 'cancelado'),
    'Estorno MANUAL registrado (payment=refunded). ' || coalesce(v_note, ''),
    v_uid
  );

  perform public.emit_order_event(
    p_order_id,
    'payment_refunded',
    'customer',
    jsonb_build_object('note', v_note, 'refund_policy', 'manual'),
    v_uid
  );

  return jsonb_build_object(
    'order_id', p_order_id,
    'payment_status', 'refunded',
    'refund_policy', 'manual'
  );
end;
$$;

revoke all on function public.admin_mark_payment_refunded(uuid, text) from public;
grant execute on function public.admin_mark_payment_refunded(uuid, text) to authenticated;

comment on function public.admin_mark_payment_refunded(uuid, text) is
  'Operador registra que o estorno ja foi feito no Mercado Pago (politica manual M8).';
