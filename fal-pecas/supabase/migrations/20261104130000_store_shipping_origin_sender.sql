-- MARCHA_LOGISTICA_ORIGEM_REMETENTE: remetente + nome interno na origem da loja
-- Singleton operacional mantido; colunas preparam multi-origem futura (is_active).

alter table public.store_shipping_origin
  add column if not exists internal_name text;

alter table public.store_shipping_origin
  add column if not exists sender_name text;

alter table public.store_shipping_origin
  add column if not exists document text;

alter table public.store_shipping_origin
  add column if not exists phone text;

alter table public.store_shipping_origin
  add column if not exists is_active boolean not null default true;

comment on column public.store_shipping_origin.internal_name is
  'Nome interno operacional da origem (admin).';
comment on column public.store_shipping_origin.sender_name is
  'Nome do remetente (Melhor Envio / frete próprio).';
comment on column public.store_shipping_origin.document is
  'CPF ou CNPJ do remetente (somente dígitos preferencialmente).';
comment on column public.store_shipping_origin.phone is
  'Telefone do remetente.';
comment on column public.store_shipping_origin.is_active is
  'Origem ativa; multi-origem futura pode ter várias linhas com uma ativa.';

update public.store_shipping_origin
set
  internal_name = coalesce(nullif(trim(internal_name), ''), 'Origem principal'),
  is_active = coalesce(is_active, true)
where internal_name is null or trim(internal_name) = '';
