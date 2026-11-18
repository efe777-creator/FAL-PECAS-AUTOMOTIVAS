-- G1 dry-run: duplicatas que a migration consolidaria (não altera dados).
-- Critério: mesma (customer_id, plate_normalized) após normalizar plate.

with normalized as (
  select
    id,
    customer_id,
    plate,
    nullif(
      upper(regexp_replace(coalesce(plate, ''), '[^A-Za-z0-9]', '', 'g')),
      ''
    ) as plate_normalized,
    created_at
  from public.customer_vehicles
),
ranked as (
  select
    *,
    row_number() over (
      partition by customer_id, plate_normalized
      order by created_at desc nulls last, id desc
    ) as rn,
    count(*) over (partition by customer_id, plate_normalized) as dup_count
  from normalized
  where plate_normalized is not null
)
select
  customer_id,
  plate_normalized,
  dup_count,
  id,
  plate,
  created_at,
  case when rn = 1 then 'KEEP' else 'DELETE' end as action
from ranked
where dup_count > 1
order by customer_id, plate_normalized, rn;
