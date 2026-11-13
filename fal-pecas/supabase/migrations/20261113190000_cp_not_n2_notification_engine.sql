-- CP-NOT N2: catálogo de kinds, deliveries, fanout enriquecido (staff gaps), severity/actionable.
-- Canais whatsapp/email ficam no modelo; N2 só entrega in_app (sent). Falha não aborta o pedido.

-- ---------------------------------------------------------------------------
-- Enrich inbox
-- ---------------------------------------------------------------------------
alter table public.app_notifications
  add column if not exists severity text
    check (severity is null or severity in (
      'informativa', 'importante', 'acao_necessaria', 'operacional'
    )),
  add column if not exists actionable boolean not null default false;

comment on column public.app_notifications.severity is 'CP-NOT: tipagem UX';
comment on column public.app_notifications.actionable is 'CP-NOT: exige decisão/ação';

-- ---------------------------------------------------------------------------
-- Catalog
-- ---------------------------------------------------------------------------
create table if not exists public.notification_kind_catalog (
  kind text primary key,
  notify_customer boolean not null default false,
  notify_staff boolean not null default false,
  severity text not null default 'informativa'
    check (severity in ('informativa', 'importante', 'acao_necessaria', 'operacional')),
  mandatory boolean not null default false,
  enabled boolean not null default true,
  channels text[] not null default array['in_app']::text[],
  staff_title text null,
  staff_body text null,
  updated_at timestamptz not null default now()
);

comment on table public.notification_kind_catalog is
  'CP-NOT: quem notificar, severity e obrigatoriedade por kind. Canais futuros: whatsapp/email.';

alter table public.notification_kind_catalog enable row level security;

drop policy if exists notification_kind_catalog_select_auth on public.notification_kind_catalog;
create policy notification_kind_catalog_select_auth
  on public.notification_kind_catalog
  for select to authenticated
  using (true);

revoke insert, update, delete on public.notification_kind_catalog from authenticated, anon;
grant select on public.notification_kind_catalog to authenticated;

insert into public.notification_kind_catalog as c (
  kind, notify_customer, notify_staff, severity, mandatory, enabled, staff_title, staff_body
) values
  ('payment_approved', true, true, 'importante', true, true,
   'Pagamento confirmado', 'Pagamento aprovado — pedido aguarda análise.'),
  ('payment_failed', true, false, 'importante', true, true, null, null),
  ('order_received', true, true, 'importante', true, true,
   'Novo pedido recebido', 'Pedido pago recebido — iniciar análise.'),
  ('analysis_started', true, true, 'informativa', false, true,
   'Pedido em análise', 'Análise do pedido foi iniciada.'),
  ('order_confirmed', true, false, 'informativa', false, true, null, null),
  ('order_confirmed_with_caveat', true, false, 'importante', false, true, null, null),
  ('order_sent_to_separation', true, true, 'importante', false, true,
   'Pedido pronto para separação', 'Pedido liberado para a separação física.'),
  ('separation_started', true, false, 'informativa', false, true, null, null),
  ('separation_completed', true, true, 'importante', false, true,
   'Separação concluída', 'Pedido separado — seguir expedição.'),
  ('order_shipped', true, false, 'importante', false, true, null, null),
  ('order_delivered', true, false, 'informativa', false, true, null, null),
  ('order_cancelled', true, false, 'importante', true, true, null, null),
  ('order_expired_unpaid', true, false, 'importante', false, true, null, null),
  ('order_awaiting_decision', true, false, 'acao_necessaria', true, true, null, null),
  ('staff_requested_customer_decision', true, false, 'acao_necessaria', true, true, null, null),
  ('staff_held_for_availability', true, false, 'importante', false, true, null, null),
  ('staff_updated_eta_and_confirmed', true, false, 'importante', false, true, null, null),
  ('customer_chose_continue_available', true, true, 'acao_necessaria', true, true,
   'Cliente aprovou — liberar separação',
   'O cliente autorizou. Finalize a confirmação e envie o pedido para separação.'),
  ('customer_chose_wait_arrival', true, true, 'operacional', true, true,
   'Cliente pediu para esperar', 'O cliente optou por aguardar disponibilidade.'),
  ('customer_chose_cancel', true, true, 'acao_necessaria', true, true,
   'Cliente pediu cancelamento', 'O cliente solicitou cancelamento — analisar.'),
  ('cancellation_approved', true, false, 'importante', true, true, null, null),
  ('cancellation_rejected', true, false, 'importante', true, true, null, null),
  ('cancellation_requested', false, true, 'acao_necessaria', true, true,
   'Cliente pediu cancelamento', 'Há uma solicitação de cancelamento para analisar.'),
  ('customer_authorized_changes', false, true, 'acao_necessaria', true, true,
   'Cliente aprovou — liberar separação',
   'O cliente autorizou. Finalize a confirmação e envie o pedido para separação.'),
  ('customer_rejected_changes', false, true, 'acao_necessaria', true, true,
   'Cliente recusou alterações', 'O cliente recusou. Renegocie ou cancele o pedido.'),
  ('customer_receipt_confirmed', false, true, 'operacional', false, true,
   'Cliente confirmou o recebimento', 'O cliente marcou o pedido como recebido.'),
  ('pickup_authorized', true, false, 'importante', false, true, null, null),
  ('shipment_tracking_updated', true, false, 'importante', false, true, null, null),
  ('occurrence_opened', false, true, 'acao_necessaria', true, true,
   'Cliente reportou problema', 'Abra o pedido / ocorrência.')
on conflict (kind) do update set
  notify_customer = excluded.notify_customer,
  notify_staff = excluded.notify_staff,
  severity = excluded.severity,
  mandatory = excluded.mandatory,
  enabled = excluded.enabled,
  staff_title = excluded.staff_title,
  staff_body = excluded.staff_body,
  updated_at = now();

-- ---------------------------------------------------------------------------
-- Deliveries (histórico por canal)
-- ---------------------------------------------------------------------------
create table if not exists public.notification_deliveries (
  id uuid primary key default gen_random_uuid(),
  source_event_id uuid not null references public.order_events (id) on delete cascade,
  recipient_profile_id uuid not null references public.profiles (id) on delete cascade,
  channel text not null check (channel in ('in_app', 'whatsapp', 'email', 'push')),
  kind text not null,
  order_id uuid null references public.orders (id) on delete set null,
  audience text not null check (audience in ('customer', 'staff')),
  status text not null default 'pending'
    check (status in ('pending', 'sent', 'failed', 'skipped', 'read')),
  attempts integer not null default 0,
  last_error text null,
  provider_ref text null,
  notification_id uuid null references public.app_notifications (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  sent_at timestamptz null
);

create unique index if not exists notification_deliveries_event_recipient_channel_uidx
  on public.notification_deliveries (source_event_id, recipient_profile_id, channel);

create index if not exists notification_deliveries_status_created_idx
  on public.notification_deliveries (status, created_at desc);

create index if not exists notification_deliveries_order_idx
  on public.notification_deliveries (order_id, created_at desc);

alter table public.notification_deliveries enable row level security;

drop policy if exists notification_deliveries_select_own on public.notification_deliveries;
create policy notification_deliveries_select_own
  on public.notification_deliveries
  for select to authenticated
  using (
    recipient_profile_id = auth.uid()
    or public.is_staff()
  );

revoke insert, update, delete on public.notification_deliveries from authenticated, anon;
grant select on public.notification_deliveries to authenticated;

comment on table public.notification_deliveries is
  'CP-NOT: log de entrega por canal. in_app=sent no fanout; WA/e-mail nas ondas N3/N4.';

-- ---------------------------------------------------------------------------
-- Copy PT-BR (inclui títulos ação necessária)
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

-- ---------------------------------------------------------------------------
-- Record delivery (idempotent)
-- ---------------------------------------------------------------------------
create or replace function public.notification_record_delivery(
  p_source_event_id uuid,
  p_recipient_profile_id uuid,
  p_channel text,
  p_kind text,
  p_order_id uuid,
  p_audience text,
  p_status text,
  p_notification_id uuid default null,
  p_error text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
begin
  insert into public.notification_deliveries (
    source_event_id, recipient_profile_id, channel, kind, order_id, audience,
    status, attempts, last_error, notification_id, sent_at, updated_at
  ) values (
    p_source_event_id, p_recipient_profile_id, p_channel, p_kind, p_order_id, p_audience,
    p_status,
    case when p_status in ('sent', 'failed', 'skipped') then 1 else 0 end,
    p_error,
    p_notification_id,
    case when p_status = 'sent' then now() else null end,
    now()
  )
  on conflict (source_event_id, recipient_profile_id, channel) do nothing
  returning id into v_id;

  if v_id is null then
    select d.id into v_id
    from public.notification_deliveries d
    where d.source_event_id = p_source_event_id
      and d.recipient_profile_id = p_recipient_profile_id
      and d.channel = p_channel;
  end if;
  return v_id;
end;
$$;

revoke all on function public.notification_record_delivery(
  uuid, uuid, text, text, uuid, text, text, uuid, text
) from public;

-- ---------------------------------------------------------------------------
-- Fanout motor
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
    -- Staff: kinds de resposta do cliente em par customer+internal → só internal
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
    -- Fallback legado se kind não estiver no catálogo
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

  -- occurrence_opened: só se source=customer
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
-- Mark-read: espelha delivery in_app → read
-- ---------------------------------------------------------------------------
create or replace function public.mark_app_notification_read(p_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_event uuid;
  v_recipient uuid;
begin
  if auth.uid() is null then
    raise exception 'Não autenticado' using errcode = 'P0001';
  end if;

  update public.app_notifications
  set read_at = coalesce(read_at, now())
  where id = p_id
    and recipient_profile_id = auth.uid()
  returning source_event_id, recipient_profile_id into v_event, v_recipient;

  if v_event is not null and v_recipient is not null then
    update public.notification_deliveries
    set status = 'read', updated_at = now()
    where source_event_id = v_event
      and recipient_profile_id = v_recipient
      and channel = 'in_app'
      and status in ('sent', 'pending');
  end if;
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

  update public.notification_deliveries d
  set status = 'read', updated_at = now()
  where d.recipient_profile_id = auth.uid()
    and d.channel = 'in_app'
    and d.status in ('sent', 'pending');

  return v_n;
end;
$$;

revoke all on function public.mark_app_notification_read(uuid) from public;
revoke all on function public.mark_all_app_notifications_read() from public;
grant execute on function public.mark_app_notification_read(uuid) to authenticated;
grant execute on function public.mark_all_app_notifications_read() to authenticated;

-- ---------------------------------------------------------------------------
-- Reprocess (staff): só failed/skipped — reinsere inbox in_app se necessário
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

  v_pickup := public.order_is_store_pickup(d.order_id);
  select c.title, c.body into v_title, v_body
  from public.app_notification_copy(d.kind, '{}'::jsonb, v_pickup) c
  limit 1;

  select * into v_cat from public.notification_kind_catalog where kind = d.kind;
  if found then
    v_sev := v_cat.severity;
    v_act := (v_cat.severity = 'acao_necessaria');
    if d.audience = 'staff' and v_cat.staff_title is not null then
      v_title := v_cat.staff_title;
      v_body := v_cat.staff_body;
    end if;
  end if;

  if v_title is null then
    raise exception 'Sem copy para kind' using errcode = 'P0001';
  end if;

  v_href := case
    when d.audience = 'staff' then '/admin/pedidos/' || d.order_id::text
    when d.kind in ('order_awaiting_decision', 'staff_requested_customer_decision')
      then '/conta/pedidos/' || d.order_id::text || '#decisao'
    else '/conta/pedidos/' || d.order_id::text
  end;

  insert into public.app_notifications (
    recipient_profile_id, audience, channel, order_id, source_event_id,
    kind, title, body, href, severity, actionable
  ) values (
    d.recipient_profile_id, d.audience, 'in_app', d.order_id, d.source_event_id,
    d.kind, v_title, v_body, v_href, v_sev, v_act
  )
  on conflict (source_event_id, recipient_profile_id) where (source_event_id is not null)
  do nothing
  returning id into v_notif;

  if v_notif is null then
    select n.id into v_notif
    from public.app_notifications n
    where n.source_event_id = d.source_event_id
      and n.recipient_profile_id = d.recipient_profile_id
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

comment on function public.fanout_app_notification(uuid, uuid, text, text, jsonb) is
  'CP-NOT N2: motor catálogo → inbox in_app + notification_deliveries.';
