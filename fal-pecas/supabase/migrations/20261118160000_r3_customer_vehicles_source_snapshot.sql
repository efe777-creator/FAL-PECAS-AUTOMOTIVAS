-- PLANO 0 / R3: snapshot completo da consulta de placa (originais API).
-- Informativo — não vira filtro PVC.

alter table public.customer_vehicles
  add column if not exists source_snapshot jsonb;

comment on column public.customer_vehicles.source_snapshot is
  'R3: payload preservado da consulta (fuel/câmbio/brutos). Não entra no filtro de peças.';
