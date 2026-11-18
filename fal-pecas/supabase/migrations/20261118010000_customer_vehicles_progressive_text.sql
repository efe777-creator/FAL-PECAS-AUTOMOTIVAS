-- PLANO 0 / marcha fundação: preservar originais na garagem sem exigir version_id.
-- FKs já são nullable; textos cobrem veículo pessoal sem match canônico completo.

alter table public.customer_vehicles
  add column if not exists maker_text text,
  add column if not exists model_text text,
  add column if not exists version_text text,
  add column if not exists engine_text text,
  add column if not exists plate text;

comment on column public.customer_vehicles.maker_text is
  'Montadora confirmada/original (texto); usada quando manufacturer_id é null ou para exibição.';
comment on column public.customer_vehicles.model_text is
  'Modelo confirmado/original (texto).';
comment on column public.customer_vehicles.version_text is
  'Versão confirmada/original (texto); não inventar genérico.';
comment on column public.customer_vehicles.engine_text is
  'Motor bruto da API/cliente quando a normalização não foi segura (ex. rejeitado pelo sanitize).';
comment on column public.customer_vehicles.plate is
  'Placa consultada, se houver; não obrigatória.';
