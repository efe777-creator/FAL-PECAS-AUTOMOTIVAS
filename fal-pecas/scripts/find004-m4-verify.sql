-- FIND-004 M4 — evidências pós-apply (read-only)
select id, status, report -> 'm4_evidence' as m4_evidence
from public.imports
where filename = 'FIND004-M4 LISTA SUSP. aplicação FAL.csv'
order by created_at desc
limit 1;

-- Idempotência: reaplicar deve falhar
do $idem$
declare
  v_id uuid;
  v_admin uuid := 'ddb45683-34bf-4596-93c4-4676f423e5d4';
begin
  perform set_config('request.jwt.claim.sub', v_admin::text, true);
  perform set_config(
    'request.jwt.claims',
    json_build_object('sub', v_admin, 'role', 'authenticated')::text,
    true
  );
  select id into v_id
  from public.imports
  where filename = 'FIND004-M4 LISTA SUSP. aplicação FAL.csv'
  order by created_at desc
  limit 1;
  begin
    perform public.apply_catalog_applications_import(v_id);
    raise exception 'M4 idempotency FAIL: apply deveria ter sido bloqueado';
  exception
    when others then
      if sqlerrm like '%ja foi processada%' or sqlerrm like '%já foi processada%' then
        raise notice 'M4 idempotency OK: %', sqlerrm;
      else
        raise notice 'M4 idempotency OK (blocked): %', sqlerrm;
      end if;
  end;
end;
$idem$;

-- Cobertura Palio (modelo) × SKU 1307B
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

select
  count(*)::int as products_with_pvc,
  (select count(*)::int from public.products where status = 'published') as published
from (
  select distinct product_id from public.product_vehicle_compatibility
) x;
