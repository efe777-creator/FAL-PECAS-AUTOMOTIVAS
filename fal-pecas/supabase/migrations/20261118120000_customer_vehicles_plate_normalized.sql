-- PLANO 1 / G1: dedup por placa normalizada (unique parcial por cliente).
-- plate_normalized = uppercase sem hífen/espaços; null/vazio fora do unique.

alter table public.customer_vehicles
  add column if not exists plate_normalized text;

comment on column public.customer_vehicles.plate_normalized is
  'Placa normalizada (A-Z0-9 upper) para unique parcial; null se sem placa.';

-- Backfill a partir de plate (mesma regra app: só alfanumérico upper).
update public.customer_vehicles
set plate_normalized = nullif(
  upper(regexp_replace(coalesce(plate, ''), '[^A-Za-z0-9]', '', 'g')),
  ''
)
where plate is not null
  and (plate_normalized is null or plate_normalized = '');

-- Consolida duplicatas legadas: mantém a mais recente (created_at) por (customer_id, plate_normalized).
with ranked as (
  select
    id,
    row_number() over (
      partition by customer_id, plate_normalized
      order by created_at desc nulls last, id desc
    ) as rn
  from public.customer_vehicles
  where plate_normalized is not null
)
delete from public.customer_vehicles cv
using ranked r
where cv.id = r.id
  and r.rn > 1;

create unique index if not exists customer_vehicles_customer_plate_norm_uidx
  on public.customer_vehicles (customer_id, plate_normalized)
  where plate_normalized is not null;
