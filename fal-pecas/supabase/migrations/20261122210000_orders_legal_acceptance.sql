-- #14 M3: evidência de aceite contratual no pedido (versões + timestamp).
-- Estende o wrapper place_order sem reescrever o core híbrido.

alter table public.orders
  add column if not exists legal_acceptance jsonb;

comment on column public.orders.legal_acceptance is
  'Aceite contratual apresentado no checkout: terms/commercial/privacy/returns versions + accepted_at. Imutável após gravação.';

create or replace function public.sanitize_order_legal_acceptance(p_raw jsonb)
returns jsonb
language plpgsql
immutable
set search_path to 'public'
as $$
declare
  v_out jsonb := '{}'::jsonb;
  v_key text;
  v_val text;
begin
  if p_raw is null or jsonb_typeof(p_raw) <> 'object' then
    return null;
  end if;
  foreach v_key in array array[
    'terms_version', 'commercial_version', 'privacy_version', 'returns_version', 'accepted_at'
  ]
  loop
    v_val := nullif(trim(both from coalesce(p_raw ->> v_key, '')), '');
    if v_val is not null then
      v_val := left(v_val, 64);
      v_out := v_out || jsonb_build_object(v_key, v_val);
    end if;
  end loop;
  if v_out ? 'terms_version'
     and v_out ? 'commercial_version'
     and v_out ? 'privacy_version'
     and v_out ? 'returns_version'
     and v_out ? 'accepted_at' then
    return v_out;
  end if;
  return null;
end;
$$;

create or replace function public.place_order(p_payload jsonb)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_result jsonb;
  v_attr jsonb;
  v_legal jsonb;
  v_order_id uuid;
  v_already boolean;
begin
  v_result := public.place_order_core_hybrid(p_payload);
  v_already := coalesce((v_result ->> 'already_existed')::boolean, false);
  if v_already then
    return v_result;
  end if;

  v_order_id := nullif(v_result ->> 'order_id', '')::uuid;
  if v_order_id is null then
    return v_result;
  end if;

  v_attr := public.sanitize_order_attribution(p_payload -> 'attribution');
  if v_attr is not null then
    update public.orders o
    set attribution = v_attr
    where o.id = v_order_id
      and o.attribution is null;
  end if;

  v_legal := public.sanitize_order_legal_acceptance(p_payload -> 'legal_acceptance');
  if v_legal is not null then
    update public.orders o
    set legal_acceptance = v_legal
    where o.id = v_order_id
      and o.legal_acceptance is null;
  end if;

  return v_result;
end;
$function$;

revoke all on function public.sanitize_order_legal_acceptance(jsonb)
  from public, anon, authenticated, service_role;
revoke all on function public.place_order(jsonb)
  from public, anon, authenticated, service_role;

grant execute on function public.place_order(jsonb) to authenticated, service_role;

comment on function public.place_order(jsonb) is
  'Checkout wrapper: place_order_core_hybrid + attribution + legal_acceptance (#14).';
