select m.name as model_name, mf.name as maker, count(vv.id)::int as vv_count
from public.models m
join public.manufacturers mf on mf.id = m.manufacturer_id
left join public.vehicle_versions vv on vv.model_id = m.id
where m.name ~* '(1\.0|1\.6|10MT|16AT|UNIQUE|COMFORT|INTENS|INTENSE|EXPRESSION|UNIQUE)'
   or position(' ' in m.name) > 0 and (
     m.name ilike '%unique%'
     or m.name ilike '%intens%'
     or m.name ilike '%comfort%'
     or m.name ilike '%expression%'
     or m.name ilike '%10mt%'
     or m.name ilike '%1.0%'
   )
group by m.name, mf.name
order by m.name
limit 80;
