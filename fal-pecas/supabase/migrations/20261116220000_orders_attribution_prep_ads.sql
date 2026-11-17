-- Prep Ads: atribuição (UTM/gclid/fbclid) no pedido sem reescrever place_order inteiro.
-- Wrapper grava attribution após o core; core permanece a função híbrida FAL PAY.
--
-- Nota: pg_get_function_identity_arguments devolve "p_payload jsonb" (com nome do arg).
-- Usar to_regprocedure('…(jsonb)') para o rename — comparação com só 'jsonb' falha.

alter table public.orders
  add column if not exists attribution jsonb;

comment on column public.orders.attribution is
  'Atribuição de aquisição (utm_*, gclid, fbclid, landing_path). Prep Google/Meta Ads.';

create or replace function public.sanitize_order_attribution(p_raw jsonb)
returns jsonb
language plpgsql
immutable
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
    'utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content',
    'gclid', 'fbclid', 'landing_path', 'captured_at'
  ]
  loop
    v_val := nullif(trim(both from coalesce(p_raw ->> v_key, '')), '');
    if v_val is not null then
      if v_key = 'landing_path' then
        v_val := left(v_val, 512);
      elsif v_key = 'captured_at' then
        v_val := left(v_val, 40);
      else
        v_val := left(v_val, 256);
      end if;
      v_out := v_out || jsonb_build_object(v_key, v_val);
    end if;
  end loop;
  if v_out = '{}'::jsonb then
    return null;
  end if;
  return v_out;
end;
$$;

do $$
begin
  if to_regprocedure('public.place_order(jsonb)') is not null
     and to_regprocedure('public.place_order_core_hybrid(jsonb)') is null then
    execute 'alter function public.place_order(jsonb) rename to place_order_core_hybrid';
  end if;
end $$;

create or replace function public.place_order(p_payload jsonb)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_result jsonb;
  v_attr jsonb;
  v_order_id uuid;
  v_already boolean;
begin
  v_result := public.place_order_core_hybrid(p_payload);
  v_already := coalesce((v_result ->> 'already_existed')::boolean, false);
  if v_already then
    return v_result;
  end if;

  v_attr := public.sanitize_order_attribution(p_payload -> 'attribution');
  if v_attr is null then
    return v_result;
  end if;

  v_order_id := nullif(v_result ->> 'order_id', '')::uuid;
  if v_order_id is null then
    return v_result;
  end if;

  update public.orders o
  set attribution = v_attr
  where o.id = v_order_id
    and o.attribution is null;

  return v_result;
end;
$function$;

-- RENAME preserva grants no OID: revogar core de todos os papéis da API.
revoke all on function public.sanitize_order_attribution(jsonb)
  from public, anon, authenticated, service_role;
revoke all on function public.place_order_core_hybrid(jsonb)
  from public, anon, authenticated, service_role;
revoke all on function public.place_order(jsonb)
  from public, anon, authenticated, service_role;

grant execute on function public.place_order(jsonb) to authenticated, service_role;

comment on function public.place_order(jsonb) is
  'Checkout wrapper: place_order_core_hybrid + attribution (prep Ads).';

comment on function public.place_order_core_hybrid(jsonb) is
  'Core place_order (FAL PAY híbrido). Não chamar do client — use place_order.';
