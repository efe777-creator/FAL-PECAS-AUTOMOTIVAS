-- FIND-004 MARCHA 5 — evidências comerciais (read-only)

-- S1: cobertura published × PVC
select
  (select count(*)::int from public.products where status = 'published') as published,
  (
    select count(distinct p.id)::int
    from public.products p
    join public.product_vehicle_compatibility pvc on pvc.product_id = p.id
    where p.status = 'published'
  ) as with_pvc,
  (select count(*)::int from public.product_vehicle_compatibility) as pvc_rows;

-- S2: 1307B Palio — N VVs (blank→todas)
select
  p.sku,
  m.name as model,
  count(*)::int as pvc_n,
  count(distinct pvc.vehicle_version_id)::int as vv_distinct,
  array_agg(distinct coalesce(vv.version_name, '(null)') order by coalesce(vv.version_name, '(null)')) as version_names
from public.products p
join public.product_vehicle_compatibility pvc on pvc.product_id = p.id
join public.vehicle_versions vv on vv.id = pvc.vehicle_version_id and vv.status = 'active'
join public.models m on m.id = vv.model_id
where p.sku = '1307B' and lower(m.name) = 'palio'
group by p.sku, m.name;

-- S3: amostra 5 SKUs — makers distintos nas apps
select
  p.sku,
  count(*)::int as pvc_n,
  count(distinct mf.name)::int as makers_n,
  count(distinct m.name)::int as models_n
from public.products p
join public.product_vehicle_compatibility pvc on pvc.product_id = p.id
join public.vehicle_versions vv on vv.id = pvc.vehicle_version_id and vv.status = 'active'
join public.models m on m.id = vv.model_id
join public.manufacturers mf on mf.id = vv.manufacturer_id
where p.status = 'published'
  and p.sku in ('1307B', '1308B', 'BRD2109', '4893S', 'SK1223')
group by p.sku
order by p.sku;

-- S4: filtro por modelo Palio — quantos produtos published batem
select count(distinct p.id)::int as products_matching_palio
from public.products p
join public.product_vehicle_compatibility pvc on pvc.product_id = p.id
join public.vehicle_versions vv on vv.id = pvc.vehicle_version_id and vv.status = 'active'
join public.models m on m.id = vv.model_id
where p.status = 'published' and lower(m.name) = 'palio';

-- S5: open-end year_end null ainda presente (não inventado)
select count(*)::int as pvc_open_end
from public.product_vehicle_compatibility
where year_end is null;
