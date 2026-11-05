-- POL provisório (homologação B) — só produtos sem pol_unit.
-- Não é valor comercial definitivo. pol_origin = global (bulk/revisão).
-- Moto ≤12: POL 1 permite várias unidades pequenas antes de forçar carro.

update public.products
set
  pol_unit = 1,
  logistic_porte = coalesce(logistic_porte, 'pequeno'),
  vehicle_min_code = coalesce(nullif(vehicle_min_code, ''), 'motorcycle'),
  compatible_vehicle_codes = case
    when compatible_vehicle_codes is null or cardinality(compatible_vehicle_codes) = 0
      then array['motorcycle', 'car']::text[]
    else compatible_vehicle_codes
  end,
  own_delivery_allowed = coalesce(own_delivery_allowed, true),
  pol_origin = 'global',
  logistic_profile_origin = coalesce(logistic_profile_origin, 'global'),
  updated_at = now()
where pol_unit is null
  and status = 'published';
