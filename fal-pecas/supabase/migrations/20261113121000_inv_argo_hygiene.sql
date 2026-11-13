-- INV Onda 1 — higiene pontual Fiat Argo (casing + MOTOR→engine)
-- Remapeia PVC se chave natural colidir.

-- 1) Title-case versões comerciais UPPER
update public.vehicle_versions vv
set version_name = case upper(vv.version_name)
      when 'DRIVE' then 'Drive'
      when 'HGT' then 'HGT'
      when 'PRECISION' then 'Precision'
      when 'TREKKING' then 'Trekking'
      else vv.version_name
    end,
    updated_at = now()
from public.models m
join public.manufacturers mf on mf.id = m.manufacturer_id
where vv.model_id = m.id
  and lower(mf.name) = 'fiat'
  and lower(m.name) = 'argo'
  and vv.version_name in ('DRIVE', 'HGT', 'PRECISION', 'TREKKING', 'Hgt');

-- 2) MOTOR 1.x → engine; se já existe VV alvo, merge PVC e apaga sujo
with dirty as (
  select vv.id as dirty_id,
         m.id as model_id,
         vv.year,
         (regexp_match(vv.version_name, '([0-9]+\.[0-9]+)'))[1] as eng
  from public.vehicle_versions vv
  join public.models m on m.id = vv.model_id
  join public.manufacturers mf on mf.id = m.manufacturer_id
  where lower(mf.name) = 'fiat'
    and lower(m.name) = 'argo'
    and vv.version_name ~* '^MOTOR\s+[0-9]+\.[0-9]+'
),
targets as (
  select d.dirty_id, d.eng, d.year, d.model_id,
    (
      select vv2.id
      from public.vehicle_versions vv2
      where vv2.model_id = d.model_id
        and vv2.year is not distinct from d.year
        and coalesce(vv2.engine, '') = d.eng
        and coalesce(vv2.version_name, '') = ''
      limit 1
    ) as target_id
  from dirty d
)
update public.product_vehicle_compatibility pvc
set vehicle_version_id = t.target_id
from targets t
where pvc.vehicle_version_id = t.dirty_id
  and t.target_id is not null
  and not exists (
    select 1 from public.product_vehicle_compatibility x
    where x.product_id = pvc.product_id
      and x.vehicle_version_id = t.target_id
  );

delete from public.product_vehicle_compatibility pvc
using (
  select vv.id as dirty_id
  from public.vehicle_versions vv
  join public.models m on m.id = vv.model_id
  join public.manufacturers mf on mf.id = m.manufacturer_id
  where lower(mf.name) = 'fiat' and lower(m.name) = 'argo'
    and vv.version_name ~* '^MOTOR\s+[0-9]+\.[0-9]+'
) d
where pvc.vehicle_version_id = d.dirty_id
  and exists (
    select 1 from public.vehicle_versions vv2
    join public.models m2 on m2.id = vv2.model_id
    where m2.id = (select model_id from public.vehicle_versions where id = d.dirty_id)
      and vv2.year is not distinct from (select year from public.vehicle_versions where id = d.dirty_id)
      and coalesce(vv2.engine, '') = (regexp_match((select version_name from public.vehicle_versions where id = d.dirty_id), '([0-9]+\.[0-9]+)'))[1]
      and coalesce(vv2.version_name, '') = ''
      and vv2.id <> d.dirty_id
  );

delete from public.vehicle_versions vv
where vv.version_name ~* '^MOTOR\s+[0-9]+\.[0-9]+'
  and exists (
    select 1 from public.models m
    join public.manufacturers mf on mf.id = m.manufacturer_id
    where m.id = vv.model_id and lower(mf.name) = 'fiat' and lower(m.name) = 'argo'
  )
  and exists (
    select 1 from public.vehicle_versions vv2
    where vv2.model_id = vv.model_id
      and vv2.year is not distinct from vv.year
      and coalesce(vv2.engine, '') = (regexp_match(vv.version_name, '([0-9]+\.[0-9]+)'))[1]
      and coalesce(vv2.version_name, '') = ''
      and vv2.id <> vv.id
  );

-- restante: converter MOTOR → engine no próprio VV
update public.vehicle_versions vv
set engine = (regexp_match(vv.version_name, '([0-9]+\.[0-9]+)'))[1],
    version_name = null,
    updated_at = now()
from public.models m
join public.manufacturers mf on mf.id = m.manufacturer_id
where vv.model_id = m.id
  and lower(mf.name) = 'fiat'
  and lower(m.name) = 'argo'
  and vv.version_name ~* '^MOTOR\s+[0-9]+\.[0-9]+';
