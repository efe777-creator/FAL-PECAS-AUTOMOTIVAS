-- Harden search_path on sanitize_order_legal_acceptance (advisor).

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

revoke all on function public.sanitize_order_legal_acceptance(jsonb)
  from public, anon, authenticated, service_role;
