-- Unstick 6246e97b (auto-prazo → limbo). Item já está disponivel.
update public.orders
set status = 'em_analise',
    customer_decision = null,
    updated_at = now()
where id = '6246e97b-8d7b-449a-9669-593b920d3b62'
  and status = 'aguardando_decisao';

insert into public.order_status_history (order_id, status, note)
values (
  '6246e97b-8d7b-449a-9669-593b920d3b62',
  'em_analise',
  'Unstick FA: retirada solicitacao automatica por prazo'
);

select public.emit_order_event(
  '6246e97b-8d7b-449a-9669-593b920d3b62'::uuid,
  'staff_withdrew_customer_decision',
  'customer',
  jsonb_build_object('note', 'Unstick FA politica opt-in', 'source', 'maintenance'),
  null
);

select id, status, customer_decision from public.orders
where id = '6246e97b-8d7b-449a-9669-593b920d3b62';
