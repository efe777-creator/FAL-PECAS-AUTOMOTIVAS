-- Regression checks for 20261115231346_harden_security_definer_grants.sql.
-- Execute after migrations; any violation aborts the test.

do $$
declare
  v_unexpected_anon integer;
  v_internal_authenticated integer;
  v_mutable_paths integer;
  v_unsafe_privileged_paths integer;
begin
  with allowed_anon(name, args) as (
    values
      ('resolve_product_price', 'p_product_id uuid, p_customer_id uuid, p_at timestamp with time zone'),
      ('resolve_product_prices', 'p_product_ids uuid[], p_customer_id uuid, p_at timestamp with time zone'),
      ('try_resolve_product_amount', 'p_product_id uuid, p_customer_id uuid, p_at timestamp with time zone')
  )
  select count(*)
  into v_unexpected_anon
  from pg_proc p
  join pg_namespace n on n.oid = p.pronamespace
  left join allowed_anon a
    on a.name = p.proname
   and a.args = pg_get_function_identity_arguments(p.oid)
  where n.nspname = 'public'
    and p.prosecdef
    and has_function_privilege('anon', p.oid, 'EXECUTE')
    and a.name is null;

  if v_unexpected_anon <> 0 then
    raise exception 'Unexpected anon SECURITY DEFINER grants: %', v_unexpected_anon;
  end if;

  select count(*)
  into v_internal_authenticated
  from pg_proc p
  join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public'
    and p.proname in (
      'apply_me_tracking_update',
      'assert_shipping_quote_fingerprint',
      'build_me_request_fingerprint',
      'compute_item_cost_total',
      'emit_order_event',
      'fanout_app_notification',
      'fulfill_order_reservations',
      'log_product_measure_changes',
      'notification_record_delivery',
      'order_is_store_pickup',
      'order_packing_is_complete',
      'product_base_cost',
      'recalculate_calculated_for_products',
      'release_order_reservations',
      'sync_product_price_from_list_item',
      'trg_orders_emit_created',
      'product_base_costs_internal',
      'upsert_vehicle_canonical_internal'
    )
    and has_function_privilege('authenticated', p.oid, 'EXECUTE');

  if v_internal_authenticated <> 0 then
    raise exception 'Internal RPCs still executable by authenticated: %', v_internal_authenticated;
  end if;

  select count(*)
  into v_mutable_paths
  from pg_proc p
  join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public'
    and p.proname in (
      '_validate_product_posicao',
      'app_notification_copy',
      'build_own_items_fingerprint_key',
      'calculate_sell_from_cost',
      'f_unaccent',
      'fal_format_model_display_name',
      'is_valid_cnpj',
      'is_valid_cpf',
      'js_number_text',
      'mock_shipping_region_surcharge',
      'order_packing_structurally_complete',
      'order_transition_allowed',
      'products_measure_audit_before',
      'set_payments_updated_at',
      'shipments_ensure_checkout_quote',
      'slug_from_name',
      'slug_from_sku'
    )
    and not coalesce(p.proconfig, array[]::text[]) && array['search_path=public, extensions'];

  if v_mutable_paths <> 0 then
    raise exception 'Functions with mutable search_path: %', v_mutable_paths;
  end if;

  select count(*)
  into v_unsafe_privileged_paths
  from pg_proc p
  join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public'
    and p.proname in (
      'apply_me_tracking_update',
      'product_base_costs',
      'upsert_vehicle_canonical',
      'resolve_product_price',
      'resolve_product_prices',
      'try_resolve_product_amount'
    )
    and not coalesce(p.proconfig, array[]::text[]) && array['search_path=public, pg_temp'];

  if v_unsafe_privileged_paths <> 0 then
    raise exception 'Privileged functions do not pin pg_temp last: %', v_unsafe_privileged_paths;
  end if;
end;
$$;
