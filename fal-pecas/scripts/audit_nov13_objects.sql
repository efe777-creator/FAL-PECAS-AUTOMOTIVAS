select '120000_vehicle_aliases' as k, to_regclass('public.vehicle_aliases') is not null as ok
union all select '120000_resolution_events', to_regclass('public.vehicle_resolution_events') is not null
union all select '121000_argo', exists(select 1 from pg_proc where proname ilike '%argo%' or proname ilike '%inv_argo%')
union all select '140000_finalize', exists(select 1 from pg_proc where proname='admin_finalize_order_confirmation')
union all select '140000_separation', exists(select 1 from pg_proc where proname='complete_order_separation')
union all select '150000_own_dispatch', exists(select 1 from pg_proc where proname='admin_set_own_dispatch_details')
union all select '150000_set_tracking', exists(select 1 from pg_proc where proname='admin_set_shipment_tracking' and pg_get_function_identity_arguments(oid) like '%p_tracking_url%')
union all select '151000_no_2arg', not exists(select 1 from pg_proc where proname='customer_respond_order_decision' and pg_get_function_identity_arguments(oid)='p_order_id uuid, p_decision text')
union all select '152000_awaits', exists(select 1 from pg_proc where proname='customer_respond_order_decision' and prosrc like '%awaits_staff%')
union all select '160000_providers', to_regclass('public.own_transport_providers') is not null
union all select '160000_providers_n6', (select count(*) >= 6 from public.own_transport_providers)
union all select '161000_checkout_sample', exists(select 1 from public.shipments where metadata ? 'checkout_quote' and lower(coalesce(provider,'')) like 'melhorenvio%' limit 1)
union all select '162000_ship_url', exists(select 1 from pg_proc where proname='ship_order' and pg_get_function_identity_arguments(oid) like '%p_tracking_url%')
union all select '162000_apply_me', exists(select 1 from pg_proc where proname='apply_me_tracking_update')
union all select '162100_copy_track', exists(select 1 from pg_proc where proname='app_notification_copy' and prosrc like '%shipment_tracking_updated%')
union all select '162100_fanout_track', exists(select 1 from pg_proc where proname='fanout_app_notification' and prosrc like '%shipment_tracking_updated%');
