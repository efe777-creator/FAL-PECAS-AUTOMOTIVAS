-- CP-NOT: mesmo perfil pode ser cliente do pedido e staff — inbox separado por audience.
-- Smoke N6: payment_approved só criava 1 linha para admin-cliente (ON CONFLICT).

drop index if exists public.app_notifications_event_recipient_uidx;

create unique index app_notifications_event_recipient_audience_uidx
  on public.app_notifications (source_event_id, recipient_profile_id, audience)
  where source_event_id is not null;

-- Fanout: ON CONFLICT precisa bater com o índice novo
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
  v_notif_id uuid;
  v_cat record;
begin
  select * into v_cat
  from public.notification_kind_catalog k
  where k.kind = v_kind and k.enabled = true;

  if found then
    v_severity := v_cat.severity;
    v_actionable := (v_cat.severity = 'acao_necessaria');
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
    if v_kind in ('order_awaiting_decision', 'staff_requested_customer_decision') then
      v_severity := 'acao_necessaria';
      v_actionable := true;
    end if;
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
        kind, title, body, href, severity, actionable
      ) values (
        v_customer_profile, 'customer', 'in_app', p_order_id, p_event_id,
        v_kind, v_title, v_body, v_href_customer, v_severity, v_actionable
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

    for v_staff_id in
      select p.id from public.profiles p
      where p.role in ('administrador', 'gerente', 'operador', 'estoque', 'atendimento')
    loop
      v_notif_id := null;
      insert into public.app_notifications (
        recipient_profile_id, audience, channel, order_id, source_event_id,
        kind, title, body, href, severity, actionable
      ) values (
        v_staff_id, 'staff', 'in_app', p_order_id, p_event_id,
        v_kind, v_staff_title, v_staff_body, v_href_staff,
        case when v_severity = 'acao_necessaria' then 'acao_necessaria' else 'operacional' end,
        (v_severity = 'acao_necessaria')
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
