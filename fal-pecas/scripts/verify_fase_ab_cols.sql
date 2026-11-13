-- Colunas e enums Fase A/B
select column_name, data_type
from information_schema.columns
where table_schema = 'public'
  and table_name = 'orders'
  and column_name in (
    'customer_decision',
    'decision_proposal',
    'decision_requested_at',
    'decision_reason_kind',
    'decision_reason_text'
  )
order by 1;

select column_name, data_type
from information_schema.columns
where table_schema = 'public'
  and table_name = 'order_items'
  and column_name in (
    'availability',
    'lead_days',
    'staff_note',
    'separated',
    'separated_at'
  )
order by 1;

select proname, pg_get_function_identity_arguments(oid) as args
from pg_proc
where pronamespace = 'public'::regnamespace
  and proname in (
    'staff_withdraw_customer_decision_request',
    'admin_set_own_dispatch_details',
    'admin_set_shipment_tracking'
  )
order by 1, 2;
