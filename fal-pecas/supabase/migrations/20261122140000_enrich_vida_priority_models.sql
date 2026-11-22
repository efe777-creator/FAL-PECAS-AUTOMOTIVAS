-- Riqueza assertiva: vida de linha OEM (A1) nos canônicos prioritários.
-- NÃO inventa VV/PVC. Corolla Cross continua sem thin-seed de VV.
-- UPDATE direto: merge_model_production_years exige JWT staff (não cabe em migration).

update public.models mo set
  production_year_start = case
    when mo.production_year_start is null then v.start_y
    else least(mo.production_year_start, v.start_y)
  end,
  production_year_end = case
    when v.end_y is null then mo.production_year_end
    when mo.production_year_end is null then v.end_y
    else greatest(mo.production_year_end, v.end_y)
  end,
  evidence_url = coalesce(mo.evidence_url, v.url),
  evidence_kind = coalesce(mo.evidence_kind, 'oem_a1'),
  review_note = coalesce(mo.review_note, v.note),
  reviewed_at = coalesce(mo.reviewed_at, now())
from public.manufacturers mf,
(values
  ('Toyota','Corolla',1993,null::int,'https://www.toyota.com.br/modelos/corolla','Vida BR Corolla desde ~1993; em linha'),
  ('Toyota','Corolla Cross',2021,null,'https://www.toyota.com.br/modelos/corolla-cross','Vida BR Corolla Cross desde 2021; sem thin-seed VV — anos via vida'),
  ('Toyota','Hilux',2005,null,'https://www.toyota.com.br/modelos/hilux','Vida BR Hilux (série atual) desde ~2005; em linha'),
  ('Honda','HR-V',2015,null,'https://www.honda.com.br/automoveis/hr-v','Vida BR HR-V desde 2015; em linha'),
  ('Nissan','Sentra',2007,null,'https://www.nissan.com.br/veiculos/modelos/sentra.html','Vida BR Sentra desde ~2007; em linha')
) as v(maker, model, start_y, end_y, url, note)
where mo.manufacturer_id = mf.id
  and mf.name = v.maker and mo.name = v.model and mo.status = 'active';

update public.vehicle_versions vv
set engine = '1.8', updated_at = now()
from public.models mo
join public.manufacturers mf on mf.id = mo.manufacturer_id
where vv.model_id = mo.id
  and mf.name = 'Toyota' and mo.name = 'Corolla'
  and vv.status = 'active' and vv.year = 2023
  and lower(coalesce(vv.version_name, '')) like '%altis%premium%hybrid%'
  and (vv.engine is null or btrim(vv.engine) = '');
