-- Hotfix: predicates ausentes em prod (migrações marcadas mas funções sumidas).
-- Necessário para ship_order (lookup no IF mesmo em provider own).

create or replace function public.order_packing_structurally_complete(p_meta jsonb)
returns boolean
language plpgsql
immutable
as $$
declare
  v_vol jsonb;
  v_vols jsonb;
begin
  if p_meta is null then
    return false;
  end if;
  v_vols := p_meta -> 'packing' -> 'volumes';
  if v_vols is null or jsonb_typeof(v_vols) <> 'array' or jsonb_array_length(v_vols) < 1 then
    return false;
  end if;
  for v_vol in select value from jsonb_array_elements(v_vols)
  loop
    if coalesce(v_vol->>'id', '') = '' then
      return false;
    end if;
    if coalesce((v_vol->>'lengthCm')::numeric, 0) <= 0
       or coalesce((v_vol->>'widthCm')::numeric, 0) <= 0
       or coalesce((v_vol->>'heightCm')::numeric, 0) <= 0
       or coalesce((v_vol->>'weightKg')::numeric, 0) <= 0 then
      return false;
    end if;
  end loop;
  return true;
end;
$$;

comment on function public.order_packing_structurally_complete(jsonb) is
  'Marcha 1: packing com volumes e dims/peso > 0. Alocação SKU = Marcha 3.';

create or replace function public.order_packing_is_complete(p_order_id uuid)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_meta jsonb;
  v_vols jsonb;
  v_vol jsonb;
  v_line jsonb;
  v_exc jsonb;
  v_fp text;
  v_expected text;
  v_item record;
  v_alloc numeric;
  v_sum numeric;
begin
  select s.metadata into v_meta
  from public.shipments s
  where s.order_id = p_order_id
  order by s.created_at asc nulls last, s.id asc
  limit 1;

  if v_meta is null then
    return false;
  end if;

  if not public.order_packing_structurally_complete(v_meta) then
    return false;
  end if;

  select string_agg(x.fp, '|' order by x.fp)
  into v_expected
  from (
    select (oi.id::text || ':' || greatest(0, floor(oi.quantity))::text) as fp
    from public.order_items oi
    where oi.order_id = p_order_id
  ) x;

  if v_expected is null or v_expected = '' then
    return false;
  end if;

  v_fp := coalesce(v_meta #>> '{packing,itemsFingerprint}', v_meta #>> '{packing,items_fingerprint}', '');
  if v_fp <> '' and v_fp is distinct from v_expected then
    return false;
  end if;

  v_exc := v_meta -> 'packing' -> 'allocationException';
  if v_exc is null then
    v_exc := v_meta -> 'packing' -> 'allocation_exception';
  end if;

  if coalesce((v_exc->>'active')::boolean, false) then
    return length(trim(coalesce(v_exc->>'reason', ''))) > 0;
  end if;

  for v_item in
    select oi.id, greatest(0, floor(oi.quantity))::numeric as qty
    from public.order_items oi
    where oi.order_id = p_order_id
  loop
    if v_item.qty <= 0 then
      return false;
    end if;
    v_sum := 0;
    v_vols := v_meta -> 'packing' -> 'volumes';
    for v_vol in select value from jsonb_array_elements(v_vols)
    loop
      if v_vol -> 'lines' is null or jsonb_typeof(v_vol -> 'lines') <> 'array' then
        continue;
      end if;
      for v_line in select value from jsonb_array_elements(v_vol -> 'lines')
      loop
        if coalesce(v_line->>'orderItemId', v_line->>'order_item_id', '') = v_item.id::text then
          v_alloc := coalesce((v_line->>'quantity')::numeric, 0);
          if v_alloc <= 0 then
            return false;
          end if;
          v_sum := v_sum + v_alloc;
        end if;
      end loop;
    end loop;
    if v_sum is distinct from v_item.qty then
      return false;
    end if;
  end loop;

  for v_vol in select value from jsonb_array_elements(v_meta -> 'packing' -> 'volumes')
  loop
    if v_vol -> 'lines' is null or jsonb_typeof(v_vol -> 'lines') <> 'array' then
      continue;
    end if;
    for v_line in select value from jsonb_array_elements(v_vol -> 'lines')
    loop
      if not exists (
        select 1 from public.order_items oi
        where oi.order_id = p_order_id
          and oi.id::text = coalesce(v_line->>'orderItemId', v_line->>'order_item_id', '')
      ) then
        return false;
      end if;
    end loop;
  end loop;

  return true;
end;
$$;

comment on function public.order_packing_is_complete(uuid) is
  'Marcha 3: packing estrutural + alocação exata (ou exceção justificada) vs order_items vivos.';

revoke all on function public.order_packing_structurally_complete(jsonb) from public;
grant execute on function public.order_packing_structurally_complete(jsonb) to authenticated;

revoke all on function public.order_packing_is_complete(uuid) from public;
grant execute on function public.order_packing_is_complete(uuid) to authenticated;
grant execute on function public.order_packing_is_complete(uuid) to service_role;
