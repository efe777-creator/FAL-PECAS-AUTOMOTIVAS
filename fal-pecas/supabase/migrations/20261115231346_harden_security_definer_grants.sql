-- Harden exposed SECURITY DEFINER RPCs without breaking the public storefront.
-- Root cause: PostgreSQL grants EXECUTE to PUBLIC by default. Several older
-- migrations granted specific roles but did not revoke that inherited grant.

-- ---------------------------------------------------------------------------
-- 1. Sensitive admin RPCs that need browser access get guarded wrappers.
-- ---------------------------------------------------------------------------

alter function public.product_base_costs(uuid[])
  rename to product_base_costs_internal;

revoke all on function public.product_base_costs_internal(uuid[])
  from public, anon, authenticated, service_role;

create function public.product_base_costs(p_product_ids uuid[])
returns table (
  product_id uuid,
  base_cost numeric,
  cost_supplier_id uuid
)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not public.is_staff() then
    raise exception 'staff_required' using errcode = '42501';
  end if;

  return query
    select r.product_id, r.base_cost, r.cost_supplier_id
    from public.product_base_costs_internal(p_product_ids) r;
end;
$$;

comment on function public.product_base_costs(uuid[]) is
  'Custo base em lote; acesso restrito a staff. Implementação interna não exposta à API.';

revoke all on function public.product_base_costs(uuid[]) from public, anon;
grant execute on function public.product_base_costs(uuid[]) to authenticated;

alter function public.upsert_vehicle_canonical(text, text, integer, text, text, text)
  rename to upsert_vehicle_canonical_internal;

revoke all on function public.upsert_vehicle_canonical_internal(text, text, integer, text, text, text)
  from public, anon, authenticated, service_role;

create function public.upsert_vehicle_canonical(
  p_maker text,
  p_model text,
  p_year integer default null,
  p_engine text default null,
  p_version text default null,
  p_source text default 'plate'
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_staff()
     and coalesce(auth.jwt() ->> 'role', '') <> 'service_role' then
    raise exception 'staff_or_service_role_required' using errcode = '42501';
  end if;

  return public.upsert_vehicle_canonical_internal(
    p_maker,
    p_model,
    p_year,
    p_engine,
    p_version,
    p_source
  );
end;
$$;

comment on function public.upsert_vehicle_canonical(text, text, integer, text, text, text) is
  'Upsert canônico restrito a staff ou service_role; implementação interna não exposta.';

revoke all on function public.upsert_vehicle_canonical(text, text, integer, text, text, text)
  from public, anon;
grant execute on function public.upsert_vehicle_canonical(text, text, integer, text, text, text)
  to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- 2. Remove the implicit PUBLIC/anon grant from every privileged function.
-- ---------------------------------------------------------------------------

do $$
declare
  f record;
begin
  for f in
    select
      n.nspname as schema_name,
      p.proname as function_name,
      pg_get_function_identity_arguments(p.oid) as identity_args
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.prosecdef
  loop
    execute format(
      'revoke all on function %I.%I(%s) from public, anon',
      f.schema_name,
      f.function_name,
      f.identity_args
    );
  end loop;
end;
$$;

-- Public storefront RPCs expose only commercial price output, never costs.
grant execute on function public.resolve_product_price(uuid, uuid, timestamptz)
  to anon, authenticated;
grant execute on function public.resolve_product_prices(uuid[], uuid, timestamptz)
  to anon, authenticated;
grant execute on function public.try_resolve_product_amount(uuid, uuid, timestamptz)
  to anon, authenticated;

-- Backend/internal helpers must not be callable by arbitrary signed-in users.
revoke all on function public.apply_me_tracking_update(uuid, text, text, text)
  from authenticated;
revoke all on function public.assert_shipping_quote_fingerprint(uuid, text, uuid, text, text, numeric, jsonb)
  from authenticated;
revoke all on function public.build_me_request_fingerprint(text, text, numeric, jsonb)
  from authenticated;
revoke all on function public.compute_item_cost_total(uuid, numeric)
  from authenticated;
revoke all on function public.compute_item_cost_total(uuid, numeric, uuid)
  from authenticated;
revoke all on function public.emit_order_event(uuid, text, text, jsonb, uuid)
  from authenticated;
revoke all on function public.fanout_app_notification(uuid, uuid, text, text, jsonb)
  from authenticated;
revoke all on function public.fulfill_order_reservations(uuid, uuid)
  from authenticated;
revoke all on function public.log_product_measure_changes()
  from authenticated;
revoke all on function public.notification_record_delivery(uuid, uuid, text, text, uuid, text, text, uuid, text)
  from authenticated;
revoke all on function public.order_is_store_pickup(uuid)
  from authenticated;
revoke all on function public.order_packing_is_complete(uuid)
  from authenticated;
revoke all on function public.product_base_cost(uuid)
  from authenticated;
revoke all on function public.recalculate_calculated_for_products(uuid[])
  from authenticated;
revoke all on function public.release_order_reservations(uuid)
  from authenticated;
revoke all on function public.sync_product_price_from_list_item()
  from authenticated;
revoke all on function public.trg_orders_emit_created()
  from authenticated;

-- Edge Functions continue using service_role for these backend-only operations.
grant execute on function public.apply_me_tracking_update(uuid, text, text, text)
  to service_role;

-- ---------------------------------------------------------------------------
-- 3. Pin search_path for the 17 mutable-path routines reported by the advisor.
-- ---------------------------------------------------------------------------

alter function public._validate_product_posicao(text) set search_path = public, extensions;
alter function public.app_notification_copy(text, jsonb, boolean) set search_path = public, extensions;
alter function public.build_own_items_fingerprint_key(jsonb) set search_path = public, extensions;
alter function public.calculate_sell_from_cost(numeric, text, numeric) set search_path = public, extensions;
alter function public.f_unaccent(text) set search_path = public, extensions;
alter function public.fal_format_model_display_name(text) set search_path = public, extensions;
alter function public.is_valid_cnpj(text) set search_path = public, extensions;
alter function public.is_valid_cpf(text) set search_path = public, extensions;
alter function public.js_number_text(numeric) set search_path = public, extensions;
alter function public.mock_shipping_region_surcharge(text) set search_path = public, extensions;
alter function public.order_packing_structurally_complete(jsonb) set search_path = public, extensions;
alter function public.order_transition_allowed(text, text) set search_path = public, extensions;
alter function public.products_measure_audit_before() set search_path = public, extensions;
alter function public.set_payments_updated_at() set search_path = public, extensions;
alter function public.shipments_ensure_checkout_quote() set search_path = public, extensions;
alter function public.slug_from_name(text) set search_path = public, extensions;
alter function public.slug_from_sku(text) set search_path = public, extensions;
