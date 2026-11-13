-- Smoke Fase C (somente leitura + asserts lógicos)

-- C6: prestadores
select 'C6_providers' as check_id,
  (count(*) >= 6 and count(*) filter (where active) >= 1) as ok,
  count(*)::int as total,
  count(*) filter (where active)::int as active
from public.own_transport_providers;

-- C6: frete próprio habilitado?
select 'C6_own_enabled' as check_id,
  coalesce((select enabled from public.store_own_delivery_settings order by updated_at desc nulls last limit 1), false) as enabled,
  coalesce((select pricing_mode from public.store_own_delivery_settings order by updated_at desc nulls last limit 1), '') as pricing_mode;

-- C5: checkout_quote em ME
select 'C5_checkout_quote' as check_id,
  count(*)::int as me_shipments,
  count(*) filter (where metadata ? 'checkout_quote')::int as with_checkout_quote,
  (count(*) = 0 or count(*) filter (where metadata ? 'checkout_quote') = count(*)) as ok
from public.shipments
where lower(coalesce(provider, '')) like 'melhorenvio%';

-- C5: ops_quotes presentes em algum pedido (opcional)
select 'C5_ops_quotes_sample' as check_id,
  count(*) filter (where metadata ? 'ops_quotes')::int as with_ops_quotes
from public.shipments
where lower(coalesce(provider, '')) like 'melhorenvio%';

-- C7: ship_order assinatura
select 'C7_ship_order' as check_id,
  count(*)::int = 1 as single_overload,
  bool_or(pg_get_function_identity_arguments(oid) like '%p_tracking_url%') as has_tracking_url
from pg_proc
where pronamespace = 'public'::regnamespace and proname = 'ship_order';

-- C7: apply_me_tracking + fanout/copy
select 'C7_apply_me_tracking' as check_id,
  exists(
    select 1 from pg_proc
    where pronamespace = 'public'::regnamespace and proname = 'apply_me_tracking_update'
  ) as ok;

select 'C7_fanout_tracking' as check_id,
  (prosrc like '%shipment_tracking_updated%') as ok
from pg_proc
where pronamespace = 'public'::regnamespace and proname = 'fanout_app_notification'
limit 1;

select 'C7_copy_tracking' as check_id,
  (prosrc like '%shipment_tracking_updated%') as ok
from pg_proc
where pronamespace = 'public'::regnamespace and proname = 'app_notification_copy'
limit 1;

-- Continue awaits staff (regressão A)
select 'A_continue_awaits_staff' as check_id,
  (prosrc like '%awaits_staff%' and prosrc not like '%confirmation_finalized%') as ok
from pg_proc
where pronamespace = 'public'::regnamespace
  and proname = 'customer_respond_order_decision'
  and pg_get_function_identity_arguments(oid) = 'p_order_id uuid, p_decision text, p_reason text';

-- RPCs C5/C6/C7 chave
select 'RPC_inventory' as check_id, proname,
  pg_get_function_identity_arguments(oid) as args
from pg_proc
where pronamespace = 'public'::regnamespace
  and proname in (
    'admin_set_own_dispatch_details',
    'admin_set_shipment_tracking',
    'admin_own_delivery_attempt',
    'ship_order',
    'apply_me_tracking_update',
    'customer_respond_order_decision'
  )
order by 2, 3;
