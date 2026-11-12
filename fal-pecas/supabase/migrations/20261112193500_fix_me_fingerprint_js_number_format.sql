-- AJUSTE-035 hotfix: fingerprint ME deve espelhar Number.toString() do Edge (0.35 ≠ 0.350).

create or replace function public.js_number_text(p_num numeric)
returns text
language sql
immutable
as $$
  select case
    when p_num is null then ''
    else trim(trailing '.' from trim(trailing '0' from to_char(p_num, 'FM999999999999990.999999')))
  end
$$;

create or replace function public.build_me_request_fingerprint(
  p_origin_postal text,
  p_postal_code text,
  p_subtotal numeric,
  p_items jsonb
)
returns text
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_item jsonb;
  v_pid uuid;
  v_qty int;
  v_w numeric;
  v_h numeric;
  v_wi numeric;
  v_le numeric;
  v_parts text[] := '{}';
  v_count int := 0;
begin
  if p_items is null or jsonb_typeof(p_items) <> 'array' then
    return '';
  end if;
  for v_item in select * from jsonb_array_elements(p_items)
  loop
    v_pid := nullif(v_item->>'product_id', '')::uuid;
    if v_pid is null then
      continue;
    end if;
    v_qty := greatest(1, coalesce((v_item->>'quantity')::int, 1));
    select p.weight_kg, p.height_cm, p.width_cm, p.length_cm
    into v_w, v_h, v_wi, v_le
    from public.products p
    where p.id = v_pid;
    if not found then
      continue;
    end if;
    v_parts := array_append(
      v_parts,
      v_pid::text || ':' || v_qty::text || ':'
        || public.js_number_text(v_w) || ':'
        || public.js_number_text(v_h) || ':'
        || public.js_number_text(v_wi) || ':'
        || public.js_number_text(v_le)
    );
    v_count := v_count + v_qty;
  end loop;
  v_parts := (select array_agg(x order by x) from unnest(v_parts) x);
  return
    regexp_replace(coalesce(p_origin_postal, ''), '\D', '', 'g')
    || '::' || regexp_replace(coalesce(p_postal_code, ''), '\D', '', 'g')
    || '::' || to_char(coalesce(p_subtotal, 0), 'FM999999990.00')
    || '::' || v_count::text
    || '::' || coalesce(array_to_string(v_parts, '|'), '');
end;
$$;

revoke all on function public.js_number_text(numeric) from public;
grant execute on function public.js_number_text(numeric) to authenticated, service_role;
