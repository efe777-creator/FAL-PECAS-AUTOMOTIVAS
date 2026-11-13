-- Cliente continue_available NÃO manda para separação.
-- Fica em aguardando_decisao; operador finaliza e envia à separação.

create or replace function public.customer_respond_order_decision(
  p_order_id uuid,
  p_decision text,
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
  v_norm text;
  v_reason text := nullif(trim(coalesce(p_reason, '')), '');
  v_payload jsonb;
  v_tr jsonb;
  v_indisponivel int;
  v_prazo int;
  v_result text;
  v_status text;
begin
  if v_uid is null then
    raise exception 'Nao autenticado' using errcode = '42501';
  end if;

  v_norm := lower(trim(coalesce(p_decision, '')));

  if v_norm in ('authorize', 'authorized') then
    v_norm := 'continue_available';
  elsif v_norm in ('reject', 'rejected') then
    v_norm := 'cancel_order';
  end if;

  if v_norm not in ('continue_available', 'wait_arrival', 'cancel_order') then
    raise exception 'Decisao invalida (continue_available|wait_arrival|cancel_order)'
      using errcode = 'P0001';
  end if;

  if v_norm = 'cancel_order' and v_reason is null then
    raise exception 'Informe o motivo do cancelamento' using errcode = 'P0001';
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

  if v_order.status is distinct from 'aguardando_decisao' then
    raise exception 'Pedido nao esta aguardando autorizacao do cliente'
      using errcode = 'P0001';
  end if;

  if v_order.customer_decision in (
    'authorized', 'rejected', 'continue_available', 'wait_arrival', 'cancel_order'
  ) then
    raise exception 'Decisao ja registrada (%). Contate a loja se precisar alterar.',
      v_order.customer_decision
      using errcode = 'P0001';
  end if;

  v_payload := jsonb_build_object(
    'decision', v_norm,
    'proposal_kind', v_order.decision_proposal ->> 'kind'
  );
  if v_reason is not null then
    v_payload := v_payload || jsonb_build_object('reason', v_reason);
  end if;

  update public.orders
  set customer_decision = v_norm, updated_at = now()
  where id = p_order_id;

  if v_norm = 'continue_available' then
    select
      count(*) filter (where availability = 'indisponivel')::int,
      count(*) filter (where availability = 'disponivel_com_prazo')::int
    into v_indisponivel, v_prazo
    from public.order_items
    where order_id = p_order_id;

    v_result := case
      when v_indisponivel > 0 then 'autorizado_com_indisponivel'
      when v_prazo > 0 then 'autorizado_com_prazo'
      else 'autorizado'
    end;

    -- Sem transition para confirmado: operador libera a separação.
    insert into public.order_status_history (order_id, status, note, changed_by)
    values (
      p_order_id,
      v_order.status,
      case v_result
        when 'autorizado_com_prazo' then 'Cliente aceitou o novo prazo — aguardando operador liberar separacao'
        when 'autorizado_com_indisponivel' then 'Cliente optou por continuar com itens disponiveis — aguardando operador'
        else 'Cliente aprovou a proposta — aguardando operador liberar separacao'
      end,
      v_uid
    );

    perform public.emit_order_event(
      p_order_id,
      'customer_chose_continue_available',
      'customer',
      v_payload || jsonb_build_object('result', v_result, 'awaits_staff', true),
      v_uid
    );

    perform public.emit_order_event(
      p_order_id,
      'customer_chose_continue_available',
      'internal',
      v_payload || jsonb_build_object('result', v_result, 'awaits_staff', true),
      v_uid
    );

    -- Compat fila/legado: sinal explícito para ops
    perform public.emit_order_event(
      p_order_id,
      'customer_authorized_changes',
      'internal',
      v_payload || jsonb_build_object('result', v_result, 'via', 'continue_available'),
      v_uid
    );

    v_status := 'aguardando_decisao';
    v_tr := jsonb_build_object(
      'status', v_status,
      'customer_decision', v_norm,
      'result', v_result,
      'awaits_staff', true
    );

  elsif v_norm = 'wait_arrival' then
    v_tr := public.transition_order_status(
      p_order_id,
      'aguardando_disponibilidade',
      'Cliente pediu para esperar a chegada do(s) item(ns)',
      'customer_chose_wait_arrival',
      'customer',
      v_payload
    );

    perform public.emit_order_event(
      p_order_id,
      'customer_chose_wait_arrival',
      'internal',
      v_payload,
      v_uid
    );

    v_status := 'aguardando_disponibilidade';

  else
    perform public.emit_order_event(
      p_order_id,
      'customer_chose_cancel',
      'customer',
      v_payload,
      v_uid
    );
    perform public.emit_order_event(
      p_order_id,
      'customer_chose_cancel',
      'internal',
      v_payload,
      v_uid
    );

    if coalesce(v_order.cancellation_request, '') is distinct from 'pending'
       and coalesce(v_order.cancellation_request, '') is distinct from 'approved' then
      update public.orders
      set
        cancellation_request = 'pending',
        cancellation_reason = coalesce(v_reason, 'Cliente cancelou na decisao da loja'),
        cancellation_requested_at = now(),
        cancellation_resolved_at = null,
        cancellation_resolve_note = null,
        updated_at = now()
      where id = p_order_id;

      insert into public.order_status_history (order_id, status, note, changed_by)
      values (
        p_order_id,
        v_order.status,
        'Cliente solicitou cancelamento na decisao: ' || left(coalesce(v_reason, ''), 200),
        v_uid
      );

      perform public.emit_order_event(
        p_order_id,
        'cancellation_requested',
        'customer',
        jsonb_build_object(
          'reason', v_reason,
          'policy_refund', 'manual',
          'via', 'customer_decision'
        ),
        v_uid
      );
    end if;

    v_status := v_order.status;
  end if;

  return jsonb_build_object(
    'order_id', p_order_id,
    'status', v_status,
    'customer_decision', v_norm,
    'transition', v_tr
  );
end;
$$;

revoke all on function public.customer_respond_order_decision(uuid, text, text) from public;
grant execute on function public.customer_respond_order_decision(uuid, text, text) to authenticated;

comment on function public.customer_respond_order_decision(uuid, text, text) is
  'Cliente: continue_available fica em aguardando_decisao (ops finaliza); wait_arrival; cancel_order.';

-- Copy cliente: não promete separação imediata
create or replace function public.app_notification_copy(
  p_kind text,
  p_payload jsonb,
  p_pickup boolean
)
returns table (title text, body text)
language plpgsql
immutable
as $$
declare
  v_kind text := lower(trim(coalesce(p_kind, '')));
  v_src text := lower(coalesce(p_payload ->> 'source', ''));
begin
  if v_kind = 'pickup_authorized' then
    title := 'Pronto para retirar na loja';
    body := 'A loja liberou a retirada. Leve documento e o número do pedido.';
    return next;
    return;
  end if;

  if v_kind = 'order_shipped' and p_pickup then
    title := 'Pronto para retirar';
    body := 'Seu pedido está disponível para retirada na loja.';
    return next;
    return;
  end if;

  if v_kind = 'order_delivered' and p_pickup then
    title := 'Retirada feita';
    body := 'A retirada do pedido na loja foi registrada.';
    return next;
    return;
  end if;

  if v_kind = 'separation_completed' and p_pickup then
    title := 'Separação concluída';
    body := 'Aguardando liberação da retirada pela loja.';
    return next;
    return;
  end if;

  case v_kind
    when 'payment_approved' then
      title := 'Pagamento aprovado';
      body := 'Recebemos o pagamento do seu pedido.';
    when 'payment_failed' then
      title := 'Pagamento não aprovado';
      body := 'O pagamento não foi aprovado. Você pode tentar novamente no pedido.';
    when 'order_received' then
      title := 'Pedido recebido pela loja';
      body := 'A FAL recebeu o pedido e vai analisar.';
    when 'analysis_started' then
      title := 'Loja analisando o pedido';
      body := 'Sua compra está em análise pela loja.';
    when 'order_confirmed' then
      title := 'Pedido confirmado';
      body := 'A loja confirmou o pedido.';
    when 'order_confirmed_with_caveat' then
      title := 'Pedido confirmado';
      body := 'A loja confirmou o pedido (com prazo atualizado).';
    when 'order_sent_to_separation' then
      title := 'Pedido em separação';
      body := 'A loja começou a separar os itens.';
    when 'separation_started' then
      title := 'Separação iniciada';
      body := 'Os itens do pedido estão sendo separados.';
    when 'separation_completed' then
      title := 'Separação concluída';
      body := 'A loja concluiu a separação do pedido.';
    when 'order_shipped' then
      title := 'Pedido enviado';
      body := 'Seu pedido foi despachado. Acompanhe o rastreio no detalhe.';
    when 'order_delivered' then
      title := 'Pedido entregue';
      body := 'A entrega do pedido foi confirmada.';
    when 'order_cancelled' then
      title := 'Pedido cancelado';
      body := 'O pedido foi cancelado.';
    when 'order_expired_unpaid' then
      title := 'Pedido expirado sem pagamento';
      body := 'O prazo para pagar o pedido acabou e ele foi cancelado.';
    when 'order_awaiting_decision' then
      title := 'A loja pediu sua decisão';
      body := coalesce(nullif(trim(p_payload ->> 'reason_text'), ''), 'Abra o pedido para continuar, esperar ou cancelar.');
    when 'staff_requested_customer_decision' then
      title := 'A loja pediu sua decisão';
      body := coalesce(nullif(trim(p_payload ->> 'reason_text'), ''), 'Abra o pedido para continuar, esperar ou cancelar.');
    when 'staff_held_for_availability' then
      title := 'Pedido aguardando disponibilidade';
      body := coalesce(nullif(trim(p_payload ->> 'note'), ''), 'A loja aguarda a chegada de item(ns).');
    when 'staff_updated_eta_and_confirmed' then
      title := 'Prazo atualizado e pedido confirmado';
      body := 'A loja atualizou o prazo e liberou o pedido para separação.';
    when 'customer_chose_continue_available' then
      title := 'Confirmação recebida';
      body := 'Recebemos sua confirmação. A loja vai liberar o pedido para separação.';
    when 'customer_chose_wait_arrival' then
      title := 'Você pediu para esperar';
      body := 'Aguardaremos a disponibilidade; a loja retomará o pedido.';
    when 'customer_chose_cancel' then
      title := 'Cancelamento solicitado';
      body := 'Recebemos seu pedido de cancelamento. A loja vai analisar.';
    when 'cancellation_approved' then
      title := 'Cancelamento aprovado';
      body := 'A loja aprovou o cancelamento do pedido.';
    when 'cancellation_rejected' then
      title := 'Cancelamento recusado';
      body := 'A loja recusou a solicitação de cancelamento.';
    when 'cancellation_requested' then
      title := 'Cliente pediu cancelamento';
      body := 'Há uma solicitação de cancelamento para analisar.';
    when 'customer_authorized_changes' then
      title := 'Cliente aprovou — liberar separação';
      body := 'O cliente autorizou. Finalize a confirmação e envie o pedido para separação.';
    when 'customer_rejected_changes' then
      title := 'Cliente recusou alterações';
      body := 'O cliente recusou. Renegocie ou cancele o pedido.';
    when 'customer_receipt_confirmed' then
      title := 'Cliente confirmou o recebimento';
      body := 'O cliente marcou o pedido como recebido.';
    when 'occurrence_opened' then
      if v_src = 'customer' then
        title := 'Cliente reportou problema';
        body := coalesce(nullif(trim(p_payload ->> 'note'), ''), 'Abra o pedido / ocorrência.');
      else
        title := null;
        body := null;
      end if;
    else
      title := null;
      body := null;
  end case;

  if title is not null then
    return next;
  end if;
  return;
end;
$$;

-- Staff: copy específica ao notificar continue_available (cliente vê texto diferente acima)
create or replace function public.fanout_app_notification(
  p_event_id uuid,
  p_order_id uuid,
  p_event_type text,
  p_visibility text,
  p_payload jsonb
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_pickup boolean := public.order_is_store_pickup(p_order_id);
  v_kind text := lower(trim(coalesce(p_event_type, '')));
  v_customer_profile uuid;
  v_staff_id uuid;
  v_title text;
  v_body text;
  v_href_customer text := '/conta/pedidos/' || p_order_id::text;
  v_href_staff text := '/admin/pedidos/' || p_order_id::text;
  v_notify_customer boolean := false;
  v_notify_staff boolean := false;
begin
  if p_visibility = 'customer' and v_kind in (
    'payment_approved',
    'payment_failed',
    'order_received',
    'analysis_started',
    'order_confirmed',
    'order_confirmed_with_caveat',
    'order_sent_to_separation',
    'separation_started',
    'separation_completed',
    'order_shipped',
    'order_delivered',
    'order_cancelled',
    'order_expired_unpaid',
    'order_awaiting_decision',
    'staff_requested_customer_decision',
    'staff_held_for_availability',
    'staff_updated_eta_and_confirmed',
    'customer_chose_continue_available',
    'customer_chose_wait_arrival',
    'customer_chose_cancel',
    'cancellation_approved',
    'cancellation_rejected',
    'pickup_authorized'
  ) then
    v_notify_customer := true;
  end if;

  if v_kind in (
    'cancellation_requested',
    'customer_authorized_changes',
    'customer_rejected_changes'
  ) then
    v_notify_staff := true;
  elsif v_kind in (
    'customer_chose_continue_available',
    'customer_chose_wait_arrival',
    'customer_chose_cancel'
  ) and p_visibility = 'internal' then
    v_notify_staff := true;
  elsif v_kind = 'customer_receipt_confirmed' and p_visibility = 'internal' then
    v_notify_staff := true;
  elsif v_kind = 'occurrence_opened'
    and p_visibility = 'internal'
    and lower(coalesce(p_payload ->> 'source', '')) = 'customer' then
    v_notify_staff := true;
  end if;

  if not v_notify_customer and not v_notify_staff then
    return;
  end if;

  select c.title, c.body into v_title, v_body
  from public.app_notification_copy(v_kind, coalesce(p_payload, '{}'::jsonb), v_pickup) c
  limit 1;

  if v_title is null then
    return;
  end if;

  if v_notify_customer then
    select c.profile_id into v_customer_profile
    from public.orders o
    join public.customers c on c.id = o.customer_id
    where o.id = p_order_id;

    if v_customer_profile is not null then
      insert into public.app_notifications (
        recipient_profile_id, audience, channel, order_id, source_event_id,
        kind, title, body, href
      )
      values (
        v_customer_profile, 'customer', 'in_app', p_order_id, p_event_id,
        v_kind, v_title, v_body, v_href_customer
      )
      on conflict (source_event_id, recipient_profile_id) where (source_event_id is not null)
      do nothing;
    end if;
  end if;

  if v_notify_staff then
    -- Ops: mensagem de ação (não a copy do cliente)
    if v_kind = 'customer_chose_continue_available' then
      v_title := 'Cliente aprovou — liberar separação';
      v_body := 'O cliente autorizou. Finalize a confirmação e envie o pedido para separação.';
    end if;

    for v_staff_id in
      select p.id
      from public.profiles p
      where p.role in ('administrador', 'gerente', 'operador', 'estoque', 'atendimento')
    loop
      insert into public.app_notifications (
        recipient_profile_id, audience, channel, order_id, source_event_id,
        kind, title, body, href
      )
      values (
        v_staff_id, 'staff', 'in_app', p_order_id, p_event_id,
        v_kind, v_title, v_body, v_href_staff
      )
      on conflict (source_event_id, recipient_profile_id) where (source_event_id is not null)
      do nothing;
    end loop;
  end if;
end;
$$;
