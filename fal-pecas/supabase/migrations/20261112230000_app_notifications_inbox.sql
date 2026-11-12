-- Inbox in-app (cliente + operador). Sem WhatsApp nesta onda.
-- Fanout a partir de emit_order_event → app_notifications (lido/não lido).

create table if not exists public.app_notifications (
  id uuid primary key default gen_random_uuid(),
  recipient_profile_id uuid not null references public.profiles (id) on delete cascade,
  audience text not null check (audience in ('customer', 'staff')),
  channel text not null default 'in_app' check (channel in ('in_app', 'whatsapp', 'email', 'push')),
  order_id uuid null references public.orders (id) on delete set null,
  source_event_id uuid null references public.order_events (id) on delete set null,
  kind text not null,
  title text not null,
  body text null,
  href text not null,
  read_at timestamptz null,
  created_at timestamptz not null default now()
);

create index if not exists app_notifications_recipient_unread_created_idx
  on public.app_notifications (recipient_profile_id, read_at, created_at desc);

create unique index if not exists app_notifications_event_recipient_uidx
  on public.app_notifications (source_event_id, recipient_profile_id)
  where source_event_id is not null;

alter table public.app_notifications enable row level security;

drop policy if exists app_notifications_select_own on public.app_notifications;
create policy app_notifications_select_own on public.app_notifications
  for select to authenticated
  using (recipient_profile_id = auth.uid());

revoke insert, update, delete on public.app_notifications from authenticated, anon;
grant select on public.app_notifications to authenticated;

-- ---------------------------------------------------------------------------
-- Pickup helper (alinha com isOrderStorePickup no app)
-- ---------------------------------------------------------------------------
create or replace function public.order_is_store_pickup(p_order_id uuid)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_ship record;
  v_option text;
  v_kind text;
begin
  select s.service, s.carrier, s.metadata
  into v_ship
  from public.shipments s
  where s.order_id = p_order_id
  order by s.id asc
  limit 1;

  if not found then
    return false;
  end if;

  if lower(coalesce(v_ship.service, '')) in ('pickup')
     or lower(coalesce(v_ship.service, '')) like '%retirada%'
     or lower(coalesce(v_ship.carrier, '')) like '%retirada%'
     or lower(coalesce(v_ship.carrier, '')) like '%pickup%'
  then
    return true;
  end if;

  if v_ship.metadata is null or jsonb_typeof(v_ship.metadata) <> 'object' then
    return false;
  end if;

  v_option := lower(coalesce(
    v_ship.metadata ->> 'option_id',
    v_ship.metadata ->> 'optionId',
    ''
  ));
  if v_option like '%pickup%' or v_option = 'mock:pickup' then
    return true;
  end if;

  v_kind := lower(coalesce(
    v_ship.metadata ->> 'kind',
    v_ship.metadata ->> 'shipping_kind',
    ''
  ));
  return v_kind in ('pickup', 'retirada');
end;
$$;

revoke all on function public.order_is_store_pickup(uuid) from public;
grant execute on function public.order_is_store_pickup(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- Copy PT-BR (status + retirada)
-- ---------------------------------------------------------------------------
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
      title := 'A loja pediu sua autorização';
      body := coalesce(nullif(trim(p_payload ->> 'reason_text'), ''), 'Abra o pedido para autorizar ou recusar.');
    when 'staff_requested_customer_decision' then
      title := 'A loja pediu sua autorização';
      body := coalesce(nullif(trim(p_payload ->> 'reason_text'), ''), 'Abra o pedido para autorizar ou recusar.');
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
      title := 'Cliente autorizou alterações';
      body := 'O cliente autorizou. Confirme o pedido na Central.';
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

revoke all on function public.app_notification_copy(text, jsonb, boolean) from public;

-- ---------------------------------------------------------------------------
-- Fanout
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
  v_href_customer text := '/conta/pedidos/' || p_order_id::text;
  v_href_staff text := '/admin/pedidos/' || p_order_id::text;
  v_notify_customer boolean := false;
  v_notify_staff boolean := false;
begin
  -- Cliente: eventos customer-visible da cadeia de status / retirada / decisão
  if p_visibility = 'customer' and v_kind in (
    'payment_approved',
    'payment_failed',
    'order_received',
    'analysis_started',
    'order_confirmed',
    'order_sent_to_separation',
    'separation_started',
    'separation_completed',
    'order_shipped',
    'order_delivered',
    'order_cancelled',
    'order_expired_unpaid',
    'order_awaiting_decision',
    'staff_requested_customer_decision',
    'cancellation_approved',
    'cancellation_rejected',
    'pickup_authorized'
  ) then
    v_notify_customer := true;
  end if;

  -- Staff: ação / resposta do cliente.
  -- Kinds emitidos em pares customer+internal: só no internal (evita duplicar).
  if v_kind in (
    'cancellation_requested',
    'customer_authorized_changes',
    'customer_rejected_changes'
  ) then
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

revoke all on function public.fanout_app_notification(uuid, uuid, text, text, jsonb) from public;

-- ---------------------------------------------------------------------------
-- emit_order_event: grava evento + fanout
-- ---------------------------------------------------------------------------
create or replace function public.emit_order_event(
  p_order_id uuid,
  p_event_type text,
  p_visibility text default 'internal',
  p_payload jsonb default '{}'::jsonb,
  p_created_by uuid default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
begin
  if p_visibility not in ('internal', 'customer') then
    raise exception 'visibility inválida' using errcode = 'P0001';
  end if;

  insert into public.order_events (order_id, event_type, payload, visibility, created_by)
  values (p_order_id, p_event_type, coalesce(p_payload, '{}'::jsonb), p_visibility, p_created_by)
  returning id into v_id;

  begin
    perform public.fanout_app_notification(
      v_id,
      p_order_id,
      p_event_type,
      p_visibility,
      coalesce(p_payload, '{}'::jsonb)
    );
  exception
    when others then
      -- Inbox não pode quebrar o fluxo do pedido
      raise warning 'fanout_app_notification falhou: %', sqlerrm;
  end;

  return v_id;
end;
$$;

revoke all on function public.emit_order_event(uuid, text, text, jsonb, uuid) from public;

-- ---------------------------------------------------------------------------
-- Mark read RPCs
-- ---------------------------------------------------------------------------
create or replace function public.mark_app_notification_read(p_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'Não autenticado' using errcode = 'P0001';
  end if;
  update public.app_notifications
  set read_at = coalesce(read_at, now())
  where id = p_id
    and recipient_profile_id = auth.uid();
end;
$$;

create or replace function public.mark_all_app_notifications_read()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_n int;
begin
  if auth.uid() is null then
    raise exception 'Não autenticado' using errcode = 'P0001';
  end if;
  update public.app_notifications
  set read_at = now()
  where recipient_profile_id = auth.uid()
    and read_at is null;
  get diagnostics v_n = row_count;
  return v_n;
end;
$$;

revoke all on function public.mark_app_notification_read(uuid) from public;
revoke all on function public.mark_all_app_notifications_read() from public;
grant execute on function public.mark_app_notification_read(uuid) to authenticated;
grant execute on function public.mark_all_app_notifications_read() to authenticated;

comment on table public.app_notifications is
  'Inbox in-app cliente/operador. channel=in_app nesta onda; WhatsApp futuro.';
comment on function public.fanout_app_notification(uuid, uuid, text, text, jsonb) is
  'Gera avisos de status/retirada (cliente) e ação (staff) a partir de order_events.';
