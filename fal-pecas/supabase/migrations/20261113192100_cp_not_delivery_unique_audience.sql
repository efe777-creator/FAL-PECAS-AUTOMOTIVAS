-- CP-NOT: deliveries também por audience (admin-cliente do pedido).

drop index if exists public.notification_deliveries_event_recipient_channel_uidx;

-- Pode haver duplicata channel+event+recipient sem audience; limpar se existir
-- (mantém a mais recente)
delete from public.notification_deliveries d
using public.notification_deliveries d2
where d.id < d2.id
  and d.source_event_id = d2.source_event_id
  and d.recipient_profile_id = d2.recipient_profile_id
  and d.channel = d2.channel
  and d.audience = d2.audience;

create unique index notification_deliveries_event_recipient_channel_audience_uidx
  on public.notification_deliveries (source_event_id, recipient_profile_id, channel, audience);

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
  on conflict (source_event_id, recipient_profile_id, channel, audience) do nothing
  returning id into v_id;

  if v_id is null then
    select d.id into v_id
    from public.notification_deliveries d
    where d.source_event_id = p_source_event_id
      and d.recipient_profile_id = p_recipient_profile_id
      and d.channel = p_channel
      and d.audience = p_audience;
  end if;
  return v_id;
end;
$$;

revoke all on function public.notification_record_delivery(
  uuid, uuid, text, text, uuid, text, text, uuid, text
) from public;
