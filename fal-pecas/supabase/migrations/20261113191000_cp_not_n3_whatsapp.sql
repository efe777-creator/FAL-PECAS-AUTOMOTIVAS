-- CP-NOT N3: WhatsApp no motor — preferências, enqueue em deliveries, claim/finish.
-- Sem credenciais Meta: delivery fica skipped (provider_not_configured). Falha não afeta o pedido.

-- ---------------------------------------------------------------------------
-- Preferences (opt-in canal; mandatory ignora opt-out)
-- ---------------------------------------------------------------------------
create table if not exists public.notification_preferences (
  profile_id uuid not null references public.profiles (id) on delete cascade,
  channel text not null check (channel in ('whatsapp', 'email', 'push')),
  opted_in boolean not null default true,
  updated_at timestamptz not null default now(),
  primary key (profile_id, channel)
);

alter table public.notification_preferences enable row level security;

drop policy if exists notification_preferences_own on public.notification_preferences;
create policy notification_preferences_own on public.notification_preferences
  for all to authenticated
  using (profile_id = auth.uid())
  with check (profile_id = auth.uid());

grant select, insert, update, delete on public.notification_preferences to authenticated;

comment on table public.notification_preferences is
  'CP-NOT: opt-in por canal. Kinds mandatory ignoram opted_in=false.';

-- ---------------------------------------------------------------------------
-- Deliveries: destination + status processing
-- ---------------------------------------------------------------------------
alter table public.notification_deliveries
  add column if not exists destination text;

alter table public.notification_deliveries
  drop constraint if exists notification_deliveries_status_check;

alter table public.notification_deliveries
  add constraint notification_deliveries_status_check
  check (status in ('pending', 'processing', 'sent', 'failed', 'skipped', 'read'));

-- Catálogo: canais WhatsApp para kinds cliente de alto valor
update public.notification_kind_catalog
set channels = array['in_app', 'whatsapp']::text[],
    updated_at = now()
where kind in (
  'payment_approved',
  'payment_failed',
  'order_awaiting_decision',
  'staff_requested_customer_decision',
  'order_shipped',
  'shipment_tracking_updated',
  'pickup_authorized',
  'order_delivered',
  'order_cancelled',
  'cancellation_approved',
  'cancellation_rejected'
);

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------
create or replace function public.notification_digits_only(p text)
returns text
language sql
immutable
as $$
  select nullif(regexp_replace(coalesce(p, ''), '\D', '', 'g'), '');
$$;

create or replace function public.notification_whatsapp_allowed(
  p_profile_id uuid,
  p_mandatory boolean
)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_opt boolean;
begin
  if p_mandatory then
    return true;
  end if;
  select opted_in into v_opt
  from public.notification_preferences
  where profile_id = p_profile_id and channel = 'whatsapp';
  if not found then
    return true; -- default opt-in
  end if;
  return coalesce(v_opt, true);
end;
$$;

revoke all on function public.notification_whatsapp_allowed(uuid, boolean) from public;

create or replace function public.notification_enqueue_whatsapp(
  p_event_id uuid,
  p_order_id uuid,
  p_profile_id uuid,
  p_kind text,
  p_mandatory boolean
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_phone text;
  v_status text;
  v_err text;
begin
  select public.notification_digits_only(p.phone) into v_phone
  from public.profiles p
  where p.id = p_profile_id;

  if v_phone is null or length(v_phone) < 10 then
    v_status := 'skipped';
    v_err := 'no_phone';
  elsif not public.notification_whatsapp_allowed(p_profile_id, p_mandatory) then
    v_status := 'skipped';
    v_err := 'preference_opt_out';
  else
    v_status := 'pending';
    v_err := null;
  end if;

  insert into public.notification_deliveries (
    source_event_id, recipient_profile_id, channel, kind, order_id, audience,
    status, attempts, last_error, destination, updated_at
  ) values (
    p_event_id, p_profile_id, 'whatsapp', p_kind, p_order_id, 'customer',
    v_status,
    case when v_status = 'skipped' then 1 else 0 end,
    v_err,
    v_phone,
    now()
  )
  on conflict (source_event_id, recipient_profile_id, channel) do nothing;
end;
$$;

revoke all on function public.notification_enqueue_whatsapp(uuid, uuid, uuid, text, boolean) from public;

-- ---------------------------------------------------------------------------
-- Fanout: mesmo motor N2 + enqueue WhatsApp quando canal no catálogo
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
  v_notif_id uuid;
  v_cat record;
  v_wa boolean := false;
begin
  select * into v_cat
  from public.notification_kind_catalog k
  where k.kind = v_kind and k.enabled = true;

  if found then
    v_severity := v_cat.severity;
    v_actionable := (v_cat.severity = 'acao_necessaria');
    v_wa := ('whatsapp' = any (v_cat.channels));
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
      on conflict (source_event_id, recipient_profile_id) where (source_event_id is not null)
      do nothing
      returning id into v_notif_id;

      if v_notif_id is null then
        select n.id into v_notif_id
        from public.app_notifications n
        where n.source_event_id = p_event_id
          and n.recipient_profile_id = v_customer_profile
        limit 1;
      end if;

      perform public.notification_record_delivery(
        p_event_id, v_customer_profile, 'in_app', v_kind, p_order_id,
        'customer', 'sent', v_notif_id, null
      );

      if v_wa then
        begin
          perform public.notification_enqueue_whatsapp(
            p_event_id,
            p_order_id,
            v_customer_profile,
            v_kind,
            coalesce((select mandatory from public.notification_kind_catalog where kind = v_kind), false)
          );
        exception
          when others then
            raise warning 'notification_enqueue_whatsapp falhou: %', sqlerrm;
        end;
      end if;
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
      on conflict (source_event_id, recipient_profile_id) where (source_event_id is not null)
      do nothing
      returning id into v_notif_id;

      if v_notif_id is null then
        select n.id into v_notif_id
        from public.app_notifications n
        where n.source_event_id = p_event_id
          and n.recipient_profile_id = v_staff_id
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
-- Claim / finish (worker Edge)
-- ---------------------------------------------------------------------------
create or replace function public.claim_pending_notification_deliveries(
  p_channel text,
  p_limit integer default 20
)
returns setof public.notification_deliveries
language plpgsql
security definer
set search_path = public
as $$
begin
  return query
  with cte as (
    select d.id
    from public.notification_deliveries d
    where d.channel = p_channel
      and d.status = 'pending'
    order by d.created_at asc
    limit greatest(1, least(coalesce(p_limit, 20), 100))
    for update skip locked
  )
  update public.notification_deliveries d
  set status = 'processing',
      attempts = d.attempts + 1,
      updated_at = now()
  from cte
  where d.id = cte.id
  returning d.*;
end;
$$;

revoke all on function public.claim_pending_notification_deliveries(text, integer) from public;
grant execute on function public.claim_pending_notification_deliveries(text, integer) to service_role;

create or replace function public.finish_notification_delivery(
  p_id uuid,
  p_status text,
  p_error text default null,
  p_provider_ref text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_status not in ('sent', 'failed', 'skipped') then
    raise exception 'status inválido' using errcode = 'P0001';
  end if;

  update public.notification_deliveries
  set status = p_status,
      last_error = p_error,
      provider_ref = coalesce(p_provider_ref, provider_ref),
      sent_at = case when p_status = 'sent' then now() else sent_at end,
      updated_at = now()
  where id = p_id
    and status = 'processing';
end;
$$;

revoke all on function public.finish_notification_delivery(uuid, text, text, text) from public;
grant execute on function public.finish_notification_delivery(uuid, text, text, text) to service_role;

-- Prefs RPCs
create or replace function public.set_notification_preference(
  p_channel text,
  p_opted_in boolean
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'Não autenticado' using errcode = 'P0001';
  end if;
  if p_channel not in ('whatsapp', 'email') then
    raise exception 'Canal inválido' using errcode = 'P0001';
  end if;
  insert into public.notification_preferences (profile_id, channel, opted_in, updated_at)
  values (auth.uid(), p_channel, p_opted_in, now())
  on conflict (profile_id, channel) do update
  set opted_in = excluded.opted_in,
      updated_at = now();
end;
$$;

create or replace function public.get_notification_preference(p_channel text)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_opt boolean;
begin
  if auth.uid() is null then
    return true;
  end if;
  select opted_in into v_opt
  from public.notification_preferences
  where profile_id = auth.uid() and channel = p_channel;
  if not found then
    return true;
  end if;
  return v_opt;
end;
$$;

revoke all on function public.set_notification_preference(text, boolean) from public;
revoke all on function public.get_notification_preference(text) from public;
grant execute on function public.set_notification_preference(text, boolean) to authenticated;
grant execute on function public.get_notification_preference(text) to authenticated;

comment on function public.fanout_app_notification(uuid, uuid, text, text, jsonb) is
  'CP-NOT N3: inbox in_app + enqueue WhatsApp (pending/skipped) sem bloquear pedido.';
