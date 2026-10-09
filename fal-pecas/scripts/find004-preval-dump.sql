-- FIND-004 pré-val: dump read-only de catálogos (não altera dados)

select jsonb_build_object(
  'products', (
    select coalesce(jsonb_agg(jsonb_build_object(
      'id', id, 'sku', sku, 'commercial_ref', commercial_ref, 'name', name
    ) order by sku), '[]'::jsonb)
    from products
  ),
  'makers', (
    select coalesce(jsonb_agg(jsonb_build_object('id', id, 'name', name) order by name), '[]'::jsonb)
    from manufacturers where status = 'active'
  ),
  'models', (
    select coalesce(jsonb_agg(jsonb_build_object(
      'id', id, 'manufacturerId', manufacturer_id, 'name', name
    ) order by name), '[]'::jsonb)
    from models where status = 'active'
  ),
  'versions', (
    select coalesce(jsonb_agg(jsonb_build_object(
      'id', id,
      'manufacturerId', manufacturer_id,
      'modelId', model_id,
      'versionName', version_name
    ) order by manufacturer_id, model_id), '[]'::jsonb)
    from vehicle_versions where status = 'active'
  ),
  'pvc', (
    select coalesce(jsonb_agg(jsonb_build_object(
      'productId', product_id,
      'vehicleVersionId', vehicle_version_id,
      'yearStart', year_start,
      'yearEnd', year_end
    )), '[]'::jsonb)
    from product_vehicle_compatibility
  )
) as catalog;
