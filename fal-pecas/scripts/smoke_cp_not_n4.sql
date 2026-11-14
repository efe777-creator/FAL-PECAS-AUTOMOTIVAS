-- CP-NOT N4 smoke (somente leitura) — schema + dados + canais
-- Projeto: wtbpwuiayednvlhvuhbh

select 'catalog_enabled' as check_id, count(*)::int as value
from public.notification_kind_catalog where enabled
union all
select 'catalog_with_category', count(*)::int
from public.notification_kind_catalog where enabled and category is not null
union all
select 'inbox_with_category', count(*)::int
from public.app_notifications where category is not null
union all
select 'inbox_with_pedido_body', count(*)::int
from public.app_notifications where body like 'Pedido #%'
union all
select 'inbox_missing_category', count(*)::int
from public.app_notifications where category is null
union all
select 'channel_in_app_on',
  case when exists (
    select 1 from public.notification_channel_config where channel = 'in_app' and enabled
  ) then 1 else 0 end
union all
select 'channel_whatsapp_off',
  case when exists (
    select 1 from public.notification_channel_config where channel = 'whatsapp' and not enabled
  ) then 1 else 0 end
union all
select 'channel_email_off',
  case when exists (
    select 1 from public.notification_channel_config where channel = 'email' and not enabled
  ) then 1 else 0 end
union all
select 'realtime_app_notifications',
  case when exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and tablename = 'app_notifications'
  ) then 1 else 0 end
union all
select 'mark_all_requires_audience',
  case when exists (
    select 1 from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname = 'mark_all_app_notifications_read'
      and pg_get_function_identity_arguments(p.oid) = 'p_audience text'
  ) then 1 else 0 end
union all
select 'uidx_audience',
  case when exists (
    select 1 from pg_indexes
    where schemaname = 'public'
      and indexname = 'app_notifications_event_recipient_audience_uidx'
  ) then 1 else 0 end
union all
select 'orphan_sent_to_sep_off',
  case when exists (
    select 1 from public.notification_kind_catalog
    where kind = 'order_sent_to_separation' and not enabled
  ) then 1 else 0 end
union all
select 'kind_staff_withdrew_on',
  case when exists (
    select 1 from public.notification_kind_catalog
    where kind = 'staff_withdrew_customer_decision' and enabled
  ) then 1 else 0 end
order by 1;
