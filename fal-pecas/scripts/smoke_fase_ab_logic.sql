-- Smoke lógico (sem pedido real): presença de gates nas funções
select
  (prosrc like '%indisponivel%' and prosrc like '%continue_available%') as finalize_gates_ok
from pg_proc
where pronamespace = 'public'::regnamespace
  and proname = 'finalize_order_confirmation'
limit 1;

select
  (prosrc like '%continue_available%'
    and prosrc like '%wait_arrival%'
    and prosrc like '%cancel_order%') as customer_respond_ok
from pg_proc
where pronamespace = 'public'::regnamespace
  and proname = 'customer_respond_order_decision'
  and pg_get_function_identity_arguments(oid) = 'p_order_id uuid, p_decision text, p_reason text';

select
  (prosrc like '%app_cost%' and prosrc like '%effective_cost%' and prosrc like '%own%') as own_dispatch_ok
from pg_proc
where pronamespace = 'public'::regnamespace
  and proname = 'admin_set_own_dispatch_details';

select
  (prosrc like '%indisponivel%' and prosrc like '%pronto_para_envio%') as separation_complete_ok
from pg_proc
where pronamespace = 'public'::regnamespace
  and proname = 'complete_order_separation';

select
  (prosrc like '%kind%' and prosrc like '%decision_proposal%') as staff_request_ok
from pg_proc
where pronamespace = 'public'::regnamespace
  and proname = 'staff_request_customer_decision';
