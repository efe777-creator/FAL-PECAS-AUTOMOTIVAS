-- Limpeza modelos compostos (placa) — wtbp 2026-11-13
-- Move VV do modelo sujo → base limpa + version_name; purge cache.

-- Tucson base (só existia Tucson Glsb)
insert into public.models (id, manufacturer_id, name, slug, status)
select gen_random_uuid(), mf.id, 'Tucson', 'tucson', 'active'
from public.manufacturers mf
where lower(mf.name) = 'hyundai'
  and not exists (
    select 1 from public.models m
    where m.manufacturer_id = mf.id and lower(m.name) = 'tucson'
  );

-- Helper: reapontar VV dirty → clean
with pairs(dirty, clean, ver) as (
  values
    ('Argo Trekking', 'Argo', 'Trekking'),
    ('Palio Fire Economy', 'Palio', 'Fire Economy'),
    ('Fiorino Flex', 'Fiorino', null),
    ('Fiesta Flex', 'Fiesta', null),
    ('Polo HL AB', 'Polo', 'HL AB'),
    ('Tucson Glsb', 'Tucson', 'GLSB'),
    ('XTZ150 Crosser S', 'XTZ150', 'Crosser S')
),
resolved as (
  select
    md.id as dirty_id,
    mc.id as clean_id,
    p.ver,
    mf.id as maker_id
  from pairs p
  join public.models md on md.name = p.dirty
  join public.manufacturers mf on mf.id = md.manufacturer_id
  join public.models mc on mc.manufacturer_id = md.manufacturer_id and mc.name = p.clean
)
update public.vehicle_versions vv
set
  model_id = r.clean_id,
  version_name = coalesce(nullif(trim(vv.version_name), ''), r.ver),
  engine = case
    when vv.engine is null or trim(vv.engine) = '' then null
    when vv.engine ~ '^[0-9]+\.[0-9]+' then (regexp_match(vv.engine, '^[0-9]+\.[0-9]+'))[1]
    when vv.engine ~ '^[0-9]{2}(MT|AT|CVT)?' then
      substr((regexp_match(vv.engine, '^[0-9]{2}'))[1], 1, 1) || '.' || substr((regexp_match(vv.engine, '^[0-9]{2}'))[1], 2, 1)
    when vv.engine::text ~ '^0\.' then null
    else vv.engine
  end
from resolved r
where vv.model_id = r.dirty_id;

-- Apaga modelos dirty sem VV restante
delete from public.models m
where m.name in (
  'Argo Trekking', 'Palio Fire Economy', 'Fiorino Flex', 'Fiesta Flex',
  'Polo HL AB', 'Tucson Glsb', 'XTZ150 Crosser S'
)
and not exists (select 1 from public.vehicle_versions vv where vv.model_id = m.id);

-- Purge cache com modelo composto / fuel no model
delete from public.cached_plates
where coalesce(payload->>'model', '') ~* '(flex|trekking|fire economy|hl ab|glsb|intens|10mt|1\.0m|unique|crosser)';
