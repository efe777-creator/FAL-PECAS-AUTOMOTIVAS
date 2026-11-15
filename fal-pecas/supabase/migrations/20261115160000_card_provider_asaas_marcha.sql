-- Marcha: cartão somente Asaas; MP permanece Pix até R$ 201.
update public.payment_routing_config
set
  card_provider = 'asaas',
  updated_at = now()
where id = true;

alter table public.payment_routing_config
  alter column card_provider set default 'asaas';