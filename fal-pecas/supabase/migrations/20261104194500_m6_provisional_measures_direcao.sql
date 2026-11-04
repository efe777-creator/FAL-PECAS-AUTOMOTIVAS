-- M6 — medidas provisórias (global) para catálogo DIREÇÃO / smoke ME sandbox.
-- Não sobrescreve peso/dims já preenchidos; marca só campos preenchidos agora como global.
-- Valores = estimativa de embalagem para cotação; calibração comercial = eFe (bulk admin).

with defaults(name, w_kg, h_cm, wd_cm, l_cm) as (
  values
    ('TERMINAL DE DIREÇÃO', 0.350, 12.00, 8.00, 6.00),
    ('KIT AMORTECEDOR', 1.200, 25.00, 20.00, 15.00),
    ('AXIAL DE DIREÇÃO', 0.900, 45.00, 8.00, 8.00),
    ('PIVO', 0.500, 12.00, 10.00, 8.00),
    ('BIELETA', 0.400, 35.00, 8.00, 6.00),
    ('COXIM AMORTECEDOR', 0.450, 14.00, 12.00, 10.00),
    ('BUCHA BANDEJA', 0.300, 10.00, 8.00, 6.00),
    ('SUPORTE DA BARRA TENSORA', 0.550, 18.00, 12.00, 8.00)
)
update public.products p
set
  weight_kg = coalesce(p.weight_kg, d.w_kg),
  height_cm = coalesce(p.height_cm, d.h_cm),
  width_cm = coalesce(p.width_cm, d.wd_cm),
  length_cm = coalesce(p.length_cm, d.l_cm),
  weight_origin = case when p.weight_kg is null then 'global' else p.weight_origin end,
  height_origin = case when p.height_cm is null then 'global' else p.height_origin end,
  width_origin = case when p.width_cm is null then 'global' else p.width_origin end,
  length_origin = case when p.length_cm is null then 'global' else p.length_origin end,
  updated_at = now()
from defaults d
where p.status = 'published'
  and p.name = d.name;

-- SKUs com peso já manual (7.7 kg) mas sem dims: completa só embalagem.
update public.products p
set
  height_cm = coalesce(p.height_cm, 40.00),
  width_cm = coalesce(p.width_cm, 30.00),
  length_cm = coalesce(p.length_cm, 25.00),
  height_origin = case when p.height_cm is null then 'global' else p.height_origin end,
  width_origin = case when p.width_cm is null then 'global' else p.width_origin end,
  length_origin = case when p.length_cm is null then 'global' else p.length_origin end,
  updated_at = now()
where p.status = 'published'
  and p.sku in ('TDI1101', 'BRD6408');
