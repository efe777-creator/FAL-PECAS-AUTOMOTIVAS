select p.proname, pg_get_function_identity_arguments(p.oid) as args
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.proname in (
    'staff_request_customer_decision',
    'staff_hold_for_availability',
    'customer_respond_order_decision',
    'finalize_order_confirmation',
    'complete_order_separation',
    'set_order_item_separated',
    'admin_set_own_dispatch_details',
    'admin_set_shipment_tracking'
  )
order by 1, 2;
