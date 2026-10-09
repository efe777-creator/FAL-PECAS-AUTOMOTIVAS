select set_config('request.jwt.claim.sub', 'ddb45683-34bf-4596-93c4-4676f423e5d4', true);
select set_config(
  'request.jwt.claims',
  '{"sub":"ddb45683-34bf-4596-93c4-4676f423e5d4","role":"authenticated"}',
  true
);

with target as (
  select id from public.imports
  where filename = 'FIND004-M4 LISTA SUSP. aplicação FAL.csv'
  order by created_at desc
  limit 1
)
select
  t.id as import_id,
  i.status,
  case
    when i.status = 'done' then 'idempotency_gate_ready'
    else 'unexpected_status'
  end as gate
from target t
join public.imports i on i.id = t.id;
