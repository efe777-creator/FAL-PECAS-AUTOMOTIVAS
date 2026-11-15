-- Keep temporary schemas after trusted application schemas for privileged RPCs.
-- When pg_temp is omitted PostgreSQL searches it first, which is unsafe for
-- SECURITY DEFINER routines that resolve unqualified objects.

alter function public.apply_me_tracking_update(uuid, text, text, text)
  set search_path = public, pg_temp;

alter function public.product_base_costs(uuid[])
  set search_path = public, pg_temp;

alter function public.upsert_vehicle_canonical(text, text, integer, text, text, text)
  set search_path = public, pg_temp;

alter function public.resolve_product_price(uuid, uuid, timestamptz)
  set search_path = public, pg_temp;

alter function public.resolve_product_prices(uuid[], uuid, timestamptz)
  set search_path = public, pg_temp;

alter function public.try_resolve_product_amount(uuid, uuid, timestamptz)
  set search_path = public, pg_temp;
