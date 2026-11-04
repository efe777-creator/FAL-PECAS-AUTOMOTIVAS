-- MARCHA_ADMIN_PEDIDOS_OPERADOR: permitir cancelar pedido não pago
-- (aguardando_pagamento → cancelado). release_order_reservations já roda em
-- transition_order_status quando to = cancelado (F7F).

create or replace function public.order_transition_allowed(
  p_from text,
  p_to text
)
returns boolean
language sql
immutable
as $$
  select case
    when p_from = p_to then false
    when p_from = 'aguardando_pagamento' and p_to = 'cancelado' then true
    when p_from = 'pagamento_aprovado' and p_to = 'recebido' then true
    when p_from = 'recebido' and p_to = 'em_analise' then true
    when p_from = 'em_analise' and p_to in (
      'confirmado', 'aguardando_disponibilidade', 'aguardando_decisao'
    ) then true
    when p_from = 'aguardando_disponibilidade' and p_to in (
      'confirmado', 'aguardando_decisao', 'em_analise'
    ) then true
    when p_from = 'aguardando_decisao' and p_to in ('confirmado', 'cancelado') then true
    when p_from = 'confirmado' and p_to = 'em_separacao' then true
    when p_from = 'em_separacao' and p_to = 'pronto_para_envio' then true
    when p_from = 'pronto_para_envio' and p_to = 'enviado' then true
    when p_from = 'preparando_envio' and p_to = 'enviado' then true
    when p_from = 'enviado' and p_to = 'entregue' then true
    else false
  end;
$$;
