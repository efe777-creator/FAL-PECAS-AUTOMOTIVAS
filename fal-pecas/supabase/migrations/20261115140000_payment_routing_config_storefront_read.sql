-- Checkout, vitrine e Meus Pedidos precisam LER o roteamento real.
-- Escrita continua só staff (policy payment_routing_config_staff).

drop policy if exists payment_routing_config_read on public.payment_routing_config;
create policy payment_routing_config_read
  on public.payment_routing_config
  for select
  to anon, authenticated
  using (true);

grant select on public.payment_routing_config to anon;
grant select, update on public.payment_routing_config to authenticated;
revoke insert, delete, truncate on public.payment_routing_config from anon;

-- Marcha: cartão no Mercado Pago até o checkout Asaas estar pronto.
alter table public.payment_routing_config
  alter column card_provider set default 'mercadopago';

comment on table public.payment_routing_config is
  'Regras de roteamento FAL PAY. Leitura pública no checkout; staff altera em Pagamentos → Métodos.';
