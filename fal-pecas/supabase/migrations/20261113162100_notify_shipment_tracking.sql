-- Notifica cliente quando rastreio é atualizado (copy + fanout)

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
    return next; return;
  end if;
  if v_kind = 'order_shipped' and p_pickup then
    title := 'Pronto para retirar';
    body := 'Seu pedido está disponível para retirada na loja.';
    return next; return;
  end if;
  if v_kind = 'order_delivered' and p_pickup then
    title := 'Retirada feita';
    body := 'A retirada do pedido na loja foi registrada.';
    return next; return;
  end if;
  if v_kind = 'separation_completed' and p_pickup then
    title := 'Separação concluída';
    body := 'Aguardando liberação da retirada pela loja.';
    return next; return;
  end if;

  case v_kind
    when 'payment_approved' then title := 'Pagamento aprovado'; body := 'Recebemos o pagamento do seu pedido.';
    when 'payment_failed' then title := 'Pagamento não aprovado'; body := 'O pagamento não foi aprovado. Você pode tentar novamente no pedido.';
    when 'order_received' then title := 'Pedido recebido pela loja'; body := 'A FAL recebeu o pedido e vai analisar.';
    when 'analysis_started' then title := 'Loja analisando o pedido'; body := 'Sua compra está em análise pela loja.';
    when 'order_confirmed' then title := 'Pedido confirmado'; body := 'A loja confirmou o pedido.';
    when 'order_confirmed_with_caveat' then title := 'Pedido confirmado'; body := 'A loja confirmou o pedido (com prazo atualizado).';
    when 'order_sent_to_separation' then title := 'Pedido em separação'; body := 'A loja começou a separar os itens.';
    when 'separation_started' then title := 'Separação iniciada'; body := 'Os itens do pedido estão sendo separados.';
    when 'separation_completed' then title := 'Separação concluída'; body := 'A loja concluiu a separação do pedido.';
    when 'order_shipped' then title := 'Pedido enviado'; body := 'Seu pedido foi despachado. Acompanhe o rastreio no detalhe.';
    when 'order_delivered' then title := 'Pedido entregue'; body := 'A entrega do pedido foi confirmada.';
    when 'order_cancelled' then title := 'Pedido cancelado'; body := 'O pedido foi cancelado.';
    when 'order_expired_unpaid' then title := 'Pedido expirado sem pagamento'; body := 'O prazo para pagar o pedido acabou e ele foi cancelado.';
    when 'order_awaiting_decision' then title := 'A loja pediu sua decisão'; body := coalesce(nullif(trim(p_payload ->> 'reason_text'), ''), 'Abra o pedido para continuar, esperar ou cancelar.');
    when 'staff_requested_customer_decision' then title := 'A loja pediu sua decisão'; body := coalesce(nullif(trim(p_payload ->> 'reason_text'), ''), 'Abra o pedido para continuar, esperar ou cancelar.');
    when 'staff_held_for_availability' then title := 'Pedido aguardando disponibilidade'; body := coalesce(nullif(trim(p_payload ->> 'note'), ''), 'A loja aguarda a chegada de item(ns).');
    when 'staff_updated_eta_and_confirmed' then title := 'Prazo atualizado e pedido confirmado'; body := 'A loja atualizou o prazo e liberou o pedido para separação.';
    when 'customer_chose_continue_available' then title := 'Confirmação recebida'; body := 'Recebemos sua confirmação. A loja vai liberar o pedido para separação.';
    when 'customer_chose_wait_arrival' then title := 'Você pediu para esperar'; body := 'Aguardaremos a disponibilidade; a loja retomará o pedido.';
    when 'customer_chose_cancel' then title := 'Cancelamento solicitado'; body := 'Recebemos seu pedido de cancelamento. A loja vai analisar.';
    when 'cancellation_approved' then title := 'Cancelamento aprovado'; body := 'A loja aprovou o cancelamento do pedido.';
    when 'cancellation_rejected' then title := 'Cancelamento recusado'; body := 'A loja recusou a solicitação de cancelamento.';
    when 'cancellation_requested' then title := 'Cliente pediu cancelamento'; body := 'Há uma solicitação de cancelamento para analisar.';
    when 'customer_authorized_changes' then title := 'Cliente aprovou — liberar separação'; body := 'O cliente autorizou. Finalize a confirmação e envie o pedido para separação.';
    when 'customer_rejected_changes' then title := 'Cliente recusou alterações'; body := 'O cliente recusou. Renegocie ou cancele o pedido.';
    when 'customer_receipt_confirmed' then title := 'Cliente confirmou o recebimento'; body := 'O cliente marcou o pedido como recebido.';
    when 'shipment_tracking_updated' then
      title := 'Rastreio atualizado';
      body := coalesce(
        nullif(trim(p_payload ->> 'tracking_code'), ''),
        'Há um novo código ou link de rastreio no detalhe do pedido.'
      );
      if p_payload ->> 'tracking_code' is not null and trim(p_payload ->> 'tracking_code') <> '' then
        body := 'Código/rastreio: ' || trim(p_payload ->> 'tracking_code') || '. Abra o pedido para acompanhar.';
      end if;
    when 'occurrence_opened' then
      if v_src = 'customer' then
        title := 'Cliente reportou problema';
        body := coalesce(nullif(trim(p_payload ->> 'note'), ''), 'Abra o pedido / ocorrência.');
      else
        title := null; body := null;
      end if;
    else
      title := null; body := null;
  end case;
  if title is not null then return next; end if;
  return;
end;
$$;

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
    'payment_approved','payment_failed','order_received','analysis_started',
    'order_confirmed','order_confirmed_with_caveat','order_sent_to_separation',
    'separation_started','separation_completed','order_shipped','order_delivered',
    'order_cancelled','order_expired_unpaid','order_awaiting_decision',
    'staff_requested_customer_decision','staff_held_for_availability',
    'staff_updated_eta_and_confirmed','customer_chose_continue_available',
    'customer_chose_wait_arrival','customer_chose_cancel','cancellation_approved',
    'cancellation_rejected','pickup_authorized','shipment_tracking_updated'
  ) then
    v_notify_customer := true;
  end if;

  if v_kind in ('cancellation_requested','customer_authorized_changes','customer_rejected_changes') then
    v_notify_staff := true;
  elsif v_kind in ('customer_chose_continue_available','customer_chose_wait_arrival','customer_chose_cancel')
    and p_visibility = 'internal' then
    v_notify_staff := true;
  elsif v_kind = 'customer_receipt_confirmed' and p_visibility = 'internal' then
    v_notify_staff := true;
  elsif v_kind = 'occurrence_opened' and p_visibility = 'internal'
    and lower(coalesce(p_payload ->> 'source', '')) = 'customer' then
    v_notify_staff := true;
  end if;

  if not v_notify_customer and not v_notify_staff then return; end if;

  select c.title, c.body into v_title, v_body
  from public.app_notification_copy(v_kind, coalesce(p_payload, '{}'::jsonb), v_pickup) c
  limit 1;
  if v_title is null then return; end if;

  if v_notify_customer then
    select c.profile_id into v_customer_profile
    from public.orders o
    join public.customers c on c.id = o.customer_id
    where o.id = p_order_id;
    if v_customer_profile is not null then
      insert into public.app_notifications (
        recipient_profile_id, audience, channel, order_id, source_event_id,
        kind, title, body, href
      ) values (
        v_customer_profile, 'customer', 'in_app', p_order_id, p_event_id,
        v_kind, v_title, v_body, v_href_customer
      )
      on conflict (source_event_id, recipient_profile_id) where (source_event_id is not null)
      do nothing;
    end if;
  end if;

  if v_notify_staff then
    if v_kind = 'customer_chose_continue_available' then
      v_title := 'Cliente aprovou — liberar separação';
      v_body := 'O cliente autorizou. Finalize a confirmação e envie o pedido para separação.';
    end if;
    for v_staff_id in
      select p.id from public.profiles p
      where p.role in ('administrador', 'gerente', 'operador', 'estoque', 'atendimento')
    loop
      insert into public.app_notifications (
        recipient_profile_id, audience, channel, order_id, source_event_id,
        kind, title, body, href
      ) values (
        v_staff_id, 'staff', 'in_app', p_order_id, p_event_id,
        v_kind, v_title, v_body, v_href_staff
      )
      on conflict (source_event_id, recipient_profile_id) where (source_event_id is not null)
      do nothing;
    end loop;
  end if;
end;
$$;
