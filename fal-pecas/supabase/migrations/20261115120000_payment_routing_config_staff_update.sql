-- Admin Pagamentos → Métodos precisa UPDATE (RLS já restringe a is_staff()).
grant select, update on public.payment_routing_config to authenticated;

comment on table public.payment_routing_config is
  'Regras de roteamento FAL PAY. Staff altera via admin Pagamentos → Métodos.';
