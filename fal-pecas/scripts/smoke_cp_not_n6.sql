-- CP-NOT N6 smoke (somente leitura) — uma query UNION
-- Uso: npx supabase db query --remote=wtbpwuiayednvlhvuhbh --yes --read-only -f scripts/smoke_cp_not_n6.sql

select 'catalog_kinds' as check_id, count(*)::int as value
from public.notification_kind_catalog where enabled
union all
select 'catalog_mandatory', count(*)::int
from public.notification_kind_catalog where mandatory
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
select 'deliveries_table',
  case when to_regclass('public.notification_deliveries') is not null then 1 else 0 end
union all
select 'inbox_severity_col',
  case when exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'app_notifications' and column_name = 'severity'
  ) then 1 else 0 end
union all
select 'fn_fanout',
  case when exists (select 1 from pg_proc where proname = 'fanout_app_notification') then 1 else 0 end
union all
select 'fn_reprocess',
  case when exists (select 1 from pg_proc where proname = 'reprocess_notification_delivery') then 1 else 0 end
union all
select 'fn_copy_acao',
  case when exists (
    select 1 from pg_proc
    where proname = 'app_notification_copy' and prosrc ilike '%Ação necessária%'
  ) then 1 else 0 end
union all
select 'staff_gap_payment',
  case when exists (
    select 1 from public.notification_kind_catalog
    where kind = 'payment_approved' and notify_staff and notify_customer
  ) then 1 else 0 end
union all
select 'deliveries_sent_sample', count(*)::int
from public.notification_deliveries
where channel = 'in_app' and status in ('sent', 'read');
