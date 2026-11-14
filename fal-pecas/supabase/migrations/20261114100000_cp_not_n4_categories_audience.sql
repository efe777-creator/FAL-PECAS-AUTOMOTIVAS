-- CP-NOT N4: categorias, audience no mark-all, Realtime, Pedido # no body, fix reprocess.

-- ---------------------------------------------------------------------------
-- category
-- ---------------------------------------------------------------------------
alter table public.notification_kind_catalog
  add column if not exists category text;

alter table public.notification_kind_catalog
  drop constraint if exists notification_kind_catalog_category_check;

alter table public.notification_kind_catalog
  add constraint notification_kind_catalog_category_check
  check (
    category is null
    or category in ('pedidos', 'pagamentos', 'entregas', 'clientes', 'estoque', 'sistema')
  );

alter table public.app_notifications
  add column if not exists category text;

alter table public.app_notifications
  drop constraint if exists app_notifications_category_check;

alter table public.app_notifications
  add constraint app_notifications_category_check
  check (
    category is null
    or category in ('pedidos', 'pagamentos', 'entregas', 'clientes', 'estoque', 'sistema')
  );

comment on column public.notification_kind_catalog.category is
  'CP-NOT N4: pedidos|pagamentos|entregas|clientes|estoque|sistema';
comment on column public.app_notifications.category is
  'CP-NOT N4: espelho do catálogo no fanout';

update public.notification_kind_catalog set category = case kind
  when 'payment_approved' then 'pagamentos'
  when 'payment_failed' then 'pagamentos'
  when 'order_received' then 'pedidos'
  when 'analysis_started' then 'pedidos'
  when 'order_confirmed' then 'pedidos'
  when 'order_confirmed_with_caveat' then 'pedidos'
  when 'order_sent_to_separation' then 'pedidos'
  when 'separation_started' then 'pedidos'
  when 'separation_completed' then 'pedidos'
  when 'order_shipped' then 'entregas'
  when 'order_delivered' then 'entregas'
  when 'order_cancelled' then 'pedidos'
  when 'order_expired_unpaid' then 'pagamentos'
  when 'order_awaiting_decision' then 'pedidos'
  when 'staff_requested_customer_decision' then 'pedidos'
  when 'staff_held_for_availability' then 'estoque'
  when 'staff_updated_eta_and_confirmed' then 'pedidos'
  when 'customer_chose_continue_available' then 'clientes'
  when 'customer_chose_wait_arrival' then 'clientes'
  when 'customer_chose_cancel' then 'clientes'
  when 'cancellation_approved' then 'pedidos'
  when 'cancellation_rejected' then 'pedidos'
  when 'cancellation_requested' then 'clientes'
  when 'customer_authorized_changes' then 'clientes'
  when 'customer_rejected_changes' then 'clientes'
  when 'customer_receipt_confirmed' then 'entregas'
  when 'pickup_authorized' then 'entregas'
  when 'shipment_tracking_updated' then 'entregas'
  when 'occurrence_opened' then 'sistema'
  when 'staff_withdrew_customer_decision' then 'pedidos'
  else coalesce(category, 'sistema')
end;

-- Órfão: nunca emitido; cobertura via separation_started
update public.notification_kind_catalog
set enabled = false, updated_at = now()
where kind = 'order_sent_to_separation';

insert into public.notification_kind_catalog as c (
  kind, notify_customer, notify_staff, severity, mandatory, enabled,
  staff_title, staff_body, category
) values (
  'staff_withdrew_customer_decision', true, false, 'importante', true, true,
  null, null, 'pedidos'
)
on conflict (kind) do update set
  notify_customer = excluded.notify_customer,
  notify_staff = excluded.notify_staff,
  severity = excluded.severity,
  mandatory = excluded.mandatory,
  enabled = excluded.enabled,
  category = excluded.category,
  updated_at = now();

update public.app_notifications n
set category = c.category
from public.notification_kind_catalog c
where c.kind = n.kind
  and (n.category is distinct from c.category);

-- ---------------------------------------------------------------------------
-- Realtime
-- ---------------------------------------------------------------------------
do $$
begin
  alter publication supabase_realtime add table public.app_notifications;
exception
  when duplicate_object then null;
  when undefined_object then null;
end $$;

alter table public.app_notifications replica identity full;

-- ---------------------------------------------------------------------------
-- Fanout com category + Pedido #XXXXXXXX no body
-- ---------------------------------------------------------------------------
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
  v_staff_title text;
  v_staff_body text;
  v_href_customer text := '/conta/pedidos/' || p_order_id::text;
  v_href_staff text := '/admin/pedidos/' || p_order_id::text;
  v_notify_customer boolean := false;
  v_notify_staff boolean := false;
  v_severity text := 'informativa';
  v_actionable boolean := false;
  v_category text := 'sistema';
  v_order_ref text := upper(left(replace(p_order_id::text, '-', ''), 8));
  v_notif_id uuid;
  v_cat record;
begin
  select * into v_cat
  from public.notification_kind_catalog k
  where k.kind = v_kind and k.enabled = true;

  if found then
    v_severity := v_cat.severity;
    v_actionable := (v_cat.severity = 'acao_necessaria');
    v_category := coalesce(v_cat.category, 'sistema');
    if v_cat.notify_customer and p_visibility = 'customer' then
      v_notify_customer := true;
    end if;
    if v_cat.notify_staff then
      if v_kind in (
        'customer_chose_continue_available',
        'customer_chose_wait_arrival',
        'customer_chose_cancel',
        'customer_receipt_confirmed',
        'occurrence_opened'
      ) then
        if p_visibility = 'internal' then
          v_notify_staff := true;
        end if;
      else
        v_notify_staff := true;
      end if;
    end if;
    v_staff_title := v_cat.staff_title;
    v_staff_body := v_cat.staff_body;
  else
    if p_visibility = 'customer' and v_kind in (
      'payment_approved','payment_failed','order_received','analysis_started',
      'order_confirmed','order_confirmed_with_caveat','order_sent_to_separation',
      'separation_started','separation_completed','order_shipped','order_delivered',
      'order_cancelled','order_expired_unpaid','order_awaiting_decision',
      'staff_requested_customer_decision','staff_held_for_availability',
      'staff_updated_eta_and_confirmed','customer_chose_continue_available',
      'customer_chose_wait_arrival','customer_chose_cancel','cancellation_approved',
      'cancellation_rejected','pickup_authorized','shipment_tracking_updated',
      'staff_withdrew_customer_decision'
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
    if v_kind in ('order_awaiting_decision', 'staff_requested_customer_decision') then
      v_severity := 'acao_necessaria';
      v_actionable := true;
    end if;
    v_category := case
      when v_kind like 'payment_%' or v_kind = 'order_expired_unpaid' then 'pagamentos'
      when v_kind in ('order_shipped','order_delivered','pickup_authorized','shipment_tracking_updated','customer_receipt_confirmed') then 'entregas'
      when v_kind like 'customer_%' or v_kind = 'cancellation_requested' then 'clientes'
      when v_kind = 'staff_held_for_availability' then 'estoque'
      when v_kind = 'occurrence_opened' then 'sistema'
      else 'pedidos'
    end;
  end if;

  if v_kind = 'occurrence_opened'
     and lower(coalesce(p_payload ->> 'source', '')) <> 'customer' then
    v_notify_staff := false;
    v_notify_customer := false;
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

  -- Identificação do pedido (padrão FAL: 8 chars do uuid)
  if v_body is null or position('Pedido #' in v_body) = 0 then
    v_body := 'Pedido #' || v_order_ref || ' — ' || coalesce(v_body, v_title);
  end if;

  if v_notify_customer then
    select c.profile_id into v_customer_profile
    from public.orders o
    join public.customers c on c.id = o.customer_id
    where o.id = p_order_id;

    if v_customer_profile is not null then
      if v_kind in ('order_awaiting_decision', 'staff_requested_customer_decision') then
        v_href_customer := '/conta/pedidos/' || p_order_id::text || '#decisao';
      end if;

      insert into public.app_notifications (
        recipient_profile_id, audience, channel, order_id, source_event_id,
        kind, title, body, href, severity, actionable, category
      ) values (
        v_customer_profile, 'customer', 'in_app', p_order_id, p_event_id,
        v_kind, v_title, v_body, v_href_customer, v_severity, v_actionable, v_category
      )
      on conflict (source_event_id, recipient_profile_id, audience) where (source_event_id is not null)
      do nothing
      returning id into v_notif_id;

      if v_notif_id is null then
        select n.id into v_notif_id
        from public.app_notifications n
        where n.source_event_id = p_event_id
          and n.recipient_profile_id = v_customer_profile
          and n.audience = 'customer'
        limit 1;
      end if;

      perform public.notification_record_delivery(
        p_event_id, v_customer_profile, 'in_app', v_kind, p_order_id,
        'customer', 'sent', v_notif_id, null
      );
    end if;
  end if;

  if v_notify_staff then
    v_staff_title := coalesce(v_staff_title, v_title);
    v_staff_body := coalesce(v_staff_body, v_body);
    if position('Pedido #' in coalesce(v_staff_body, '')) = 0 then
      v_staff_body := 'Pedido #' || v_order_ref || ' — ' || coalesce(v_staff_body, v_staff_title);
    end if;

    for v_staff_id in
      select p.id from public.profiles p
      where p.role in ('administrador', 'gerente', 'operador', 'estoque', 'atendimento')
    loop
      v_notif_id := null;
      insert into public.app_notifications (
        recipient_profile_id, audience, channel, order_id, source_event_id,
        kind, title, body, href, severity, actionable, category
      ) values (
        v_staff_id, 'staff', 'in_app', p_order_id, p_event_id,
        v_kind, v_staff_title, v_staff_body, v_href_staff,
        case when v_severity = 'acao_necessaria' then 'acao_necessaria' else 'operacional' end,
        (v_severity = 'acao_necessaria'),
        v_category
      )
      on conflict (source_event_id, recipient_profile_id, audience) where (source_event_id is not null)
      do nothing
      returning id into v_notif_id;

      if v_notif_id is null then
        select n.id into v_notif_id
        from public.app_notifications n
        where n.source_event_id = p_event_id
          and n.recipient_profile_id = v_staff_id
          and n.audience = 'staff'
        limit 1;
      end if;

      perform public.notification_record_delivery(
        p_event_id, v_staff_id, 'in_app', v_kind, p_order_id,
        'staff', 'sent', v_notif_id, null
      );
    end loop;
  end if;
end;
$$;

revoke all on function public.fanout_app_notification(uuid, uuid, text, text, jsonb) from public;

-- ---------------------------------------------------------------------------
-- Mark-all por audience (cliente ≠ staff)
-- ---------------------------------------------------------------------------
drop function if exists public.mark_all_app_notifications_read();

create or replace function public.mark_all_app_notifications_read(p_audience text)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_n int;
  v_aud text := lower(trim(coalesce(p_audience, '')));
begin
  if auth.uid() is null then
    raise exception 'Não autenticado' using errcode = 'P0001';
  end if;
  if v_aud not in ('customer', 'staff') then
    raise exception 'audience inválida' using errcode = 'P0001';
  end if;

  update public.app_notifications
  set read_at = now()
  where recipient_profile_id = auth.uid()
    and audience = v_aud
    and read_at is null;
  get diagnostics v_n = row_count;

  update public.notification_deliveries d
  set status = 'read', updated_at = now()
  where d.recipient_profile_id = auth.uid()
    and d.audience = v_aud
    and d.channel = 'in_app'
    and d.status in ('sent', 'pending');

  return v_n;
end;
$$;

revoke all on function public.mark_all_app_notifications_read(text) from public;
grant execute on function public.mark_all_app_notifications_read(text) to authenticated;

-- mark single: também filtra delivery por audience
create or replace function public.mark_app_notification_read(p_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_event uuid;
  v_recipient uuid;
  v_audience text;
begin
  if auth.uid() is null then
    raise exception 'Não autenticado' using errcode = 'P0001';
  end if;

  update public.app_notifications
  set read_at = coalesce(read_at, now())
  where id = p_id
    and recipient_profile_id = auth.uid()
  returning source_event_id, recipient_profile_id, audience
  into v_event, v_recipient, v_audience;

  if v_event is not null and v_recipient is not null then
    update public.notification_deliveries
    set status = 'read', updated_at = now()
    where source_event_id = v_event
      and recipient_profile_id = v_recipient
      and audience = v_audience
      and channel = 'in_app'
      and status in ('sent', 'pending');
  end if;
end;
$$;

revoke all on function public.mark_app_notification_read(uuid) from public;
grant execute on function public.mark_app_notification_read(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- Reprocess: ON CONFLICT com audience + category
-- ---------------------------------------------------------------------------
create or replace function public.reprocess_notification_delivery(p_delivery_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  d public.notification_deliveries%rowtype;
  v_notif uuid;
  v_title text;
  v_body text;
  v_pickup boolean;
  v_href text;
  v_sev text := 'operacional';
  v_act boolean := false;
  v_category text := 'sistema';
  v_order_ref text;
  v_cat record;
begin
  if auth.uid() is null or not public.is_staff() then
    raise exception 'Sem permissão' using errcode = 'P0001';
  end if;

  select * into d from public.notification_deliveries where id = p_delivery_id;
  if not found then
    raise exception 'Delivery não encontrado' using errcode = 'P0001';
  end if;
  if d.status not in ('failed', 'skipped') then
    raise exception 'Só reprocessa failed/skipped' using errcode = 'P0001';
  end if;
  if d.channel <> 'in_app' then
    raise exception 'Reprocesso WA/e-mail na onda do canal' using errcode = 'P0001';
  end if;

  v_order_ref := upper(left(replace(coalesce(d.order_id::text, ''), '-', ''), 8));
  v_pickup := public.order_is_store_pickup(d.order_id);
  select c.title, c.body into v_title, v_body
  from public.app_notification_copy(d.kind, '{}'::jsonb, v_pickup) c
  limit 1;

  select * into v_cat from public.notification_kind_catalog where kind = d.kind;
  if found then
    v_sev := v_cat.severity;
    v_act := (v_cat.severity = 'acao_necessaria');
    v_category := coalesce(v_cat.category, 'sistema');
    if d.audience = 'staff' and v_cat.staff_title is not null then
      v_title := v_cat.staff_title;
      v_body := v_cat.staff_body;
    end if;
  end if;

  if v_title is null then
    raise exception 'Sem copy para kind' using errcode = 'P0001';
  end if;

  if v_body is null or position('Pedido #' in v_body) = 0 then
    if v_order_ref <> '' then
      v_body := 'Pedido #' || v_order_ref || ' — ' || coalesce(v_body, v_title);
    end if;
  end if;

  v_href := case
    when d.audience = 'staff' then '/admin/pedidos/' || d.order_id::text
    when d.kind in ('order_awaiting_decision', 'staff_requested_customer_decision')
      then '/conta/pedidos/' || d.order_id::text || '#decisao'
    else '/conta/pedidos/' || d.order_id::text
  end;

  insert into public.app_notifications (
    recipient_profile_id, audience, channel, order_id, source_event_id,
    kind, title, body, href, severity, actionable, category
  ) values (
    d.recipient_profile_id, d.audience, 'in_app', d.order_id, d.source_event_id,
    d.kind, v_title, v_body, v_href, v_sev, v_act, v_category
  )
  on conflict (source_event_id, recipient_profile_id, audience) where (source_event_id is not null)
  do nothing
  returning id into v_notif;

  if v_notif is null then
    select n.id into v_notif
    from public.app_notifications n
    where n.source_event_id = d.source_event_id
      and n.recipient_profile_id = d.recipient_profile_id
      and n.audience = d.audience
    limit 1;
  end if;

  update public.notification_deliveries
  set status = 'sent',
      attempts = attempts + 1,
      last_error = null,
      notification_id = v_notif,
      sent_at = now(),
      updated_at = now()
  where id = p_delivery_id;
end;
$$;

revoke all on function public.reprocess_notification_delivery(uuid) from public;
grant execute on function public.reprocess_notification_delivery(uuid) to authenticated;

-- Copy: decisão retirada pela loja
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
    when 'order_awaiting_decision' then
      title := 'Ação necessária — decisão do pedido';
      body := coalesce(nullif(trim(p_payload ->> 'reason_text'), ''), 'Abra o pedido para continuar, esperar ou cancelar.');
    when 'staff_requested_customer_decision' then
      title := 'Ação necessária — decisão do pedido';
      body := coalesce(nullif(trim(p_payload ->> 'reason_text'), ''), 'Abra o pedido para continuar, esperar ou cancelar.');
    when 'staff_held_for_availability' then title := 'Pedido aguardando disponibilidade'; body := coalesce(nullif(trim(p_payload ->> 'note'), ''), 'A loja aguarda a chegada de item(ns).');
    when 'staff_updated_eta_and_confirmed' then title := 'Prazo atualizado e pedido confirmado'; body := 'A loja atualizou o prazo e liberou o pedido para separação.';
    when 'staff_withdrew_customer_decision' then
      title := 'Decisão não é mais necessária';
      body := 'A loja retirou o pedido de decisão. Acompanhe o status no detalhe.';
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

revoke all on function public.app_notification_copy(text, jsonb, boolean) from public;
