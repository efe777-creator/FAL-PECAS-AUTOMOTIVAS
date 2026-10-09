select
  p.sku,
  count(*)::int as pvc_n,
  count(distinct pvc.vehicle_version_id)::int as vv_n
from public.products p
join public.product_vehicle_compatibility pvc on pvc.product_id = p.id
join public.vehicle_versions vv on vv.id = pvc.vehicle_version_id
join public.models m on m.id = vv.model_id
where p.sku = '1307B'
  and lower(m.name) = 'palio'
group by p.sku;
