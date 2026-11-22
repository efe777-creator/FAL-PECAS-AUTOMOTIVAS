-- Alinha vida de linha com evidência interna das VV ativas.
-- Não inventa VV/PVC. Reabre point-life (>=2015) como "em linha" (end null).

-- 1) start <= min(VV.year)
update public.models mo
set production_year_start = sub.ymin,
    review_note = coalesce(
      mo.review_note,
      'Vida alinhada ao min(VV.year) ativo'
    ),
    reviewed_at = now()
from (
  select vv.model_id, min(vv.year)::int as ymin
  from public.vehicle_versions vv
  where vv.status = 'active' and vv.year is not null
  group by vv.model_id
) sub
where mo.id = sub.model_id
  and mo.status = 'active'
  and mo.quality_status = 'verified'
  and mo.production_year_start is not null
  and sub.ymin < mo.production_year_start;

-- 2) end < max(VV.year): se VV recente (>=2024) → em linha; senão end = ymax
update public.models mo
set production_year_end = case
      when sub.ymax >= 2024 then null
      else sub.ymax
    end,
    review_note = coalesce(
      mo.review_note,
      'Vida alinhada ao max(VV.year) ativo'
    ),
    reviewed_at = now()
from (
  select vv.model_id, max(vv.year)::int as ymax
  from public.vehicle_versions vv
  where vv.status = 'active' and vv.year is not null
  group by vv.model_id
) sub
where mo.id = sub.model_id
  and mo.status = 'active'
  and mo.quality_status = 'verified'
  and mo.production_year_end is not null
  and sub.ymax > mo.production_year_end;

-- 3) Point-life era atual (start=end >= 2015): seed fino → em linha (end null)
update public.models
set production_year_end = null,
    review_note = coalesce(
      review_note,
      'Point-life >=2015 reaberto como em linha (end null)'
    ),
    reviewed_at = now()
where status = 'active'
  and quality_status = 'verified'
  and production_year_start is not null
  and production_year_end is not null
  and production_year_start = production_year_end
  and production_year_start >= 2015;
