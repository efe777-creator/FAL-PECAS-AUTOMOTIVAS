-- Marcha 3 V2.2.1: packing completo = estrutural + alocação produtos↔volumes (ou exceção).
-- Filas ME/Own usam order_packing_is_complete(order_id). Pedidos só com dims ficam em volumes.

-- ---------------------------------------------------------------------------
-- Predicado completo (lê order_items ao vivo)
-- ---------------------------------------------------------------------------
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

  -- Fingerprint atual dos itens
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

  -- Toda unidade alocada exatamente uma vez
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

  -- Linhas órfãs (item inexistente no pedido)
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

revoke all on function public.order_packing_is_complete(uuid) from public;
grant execute on function public.order_packing_is_complete(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- Filas: ME/Own exigem packing completo; volumes = sem completo
-- ---------------------------------------------------------------------------
create or replace function public.admin_logistics_queue_counts()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_volumes int := 0;
  v_me int := 0;
  v_own int := 0;
  v_rev int := 0;
  v_transito int := 0;
  v_entregues int := 0;
begin
  if auth.uid() is null or not public.is_staff() then
    raise exception 'Somente staff' using errcode = '42501';
  end if;

  select count(*)::int into v_transito from public.orders where status = 'enviado';
  select count(*)::int into v_entregues from public.orders where status = 'entregue';

  select count(*)::int into v_volumes
  from public.orders o
  join public.shipments s on s.order_id = o.id
  where o.status in ('pronto_para_envio', 'preparando_envio')
    and o.status is distinct from 'cancelado'
    and lower(coalesce(s.provider, '')) in ('melhorenvio', 'own')
    and not public.order_packing_is_complete(o.id);

  select count(*)::int into v_me
  from public.orders o
  join public.shipments s on s.order_id = o.id
  where o.status in ('pronto_para_envio', 'preparando_envio')
    and lower(coalesce(s.provider, '')) = 'melhorenvio'
    and public.order_packing_is_complete(o.id)
    and coalesce(s.metadata #>> '{me,label_state}', 'none') not in ('purchased', 'generated', 'printed')
    and exists (
      select 1 from public.payments p
      where p.order_id = o.id and p.status = 'approved'
    );

  select count(*)::int into v_own
  from public.orders o
  join public.shipments s on s.order_id = o.id
  where o.status in ('pronto_para_envio', 'preparando_envio')
    and lower(coalesce(s.provider, '')) = 'own'
    and public.order_packing_is_complete(o.id)
    and exists (
      select 1 from public.payments p
      where p.order_id = o.id and p.status = 'approved'
    );

  select count(*)::int into v_rev
  from (
    select distinct x.order_id
    from (
      select r.order_id
      from public.own_manual_reviews r
      where r.status = 'pending' and r.order_id is not null
      union
      select e.order_id
      from public.order_events e
      where e.event_type = 'occurrence_opened'
        and not exists (
          select 1
          from public.order_events r
          where r.order_id = e.order_id
            and r.event_type = 'occurrence_resolved'
            and r.payload->>'occurrence_id' = e.payload->>'occurrence_id'
        )
    ) x
  ) z;

  return jsonb_build_object(
    'volumes', v_volumes,
    'etiquetas-me', v_me,
    'entregas-proprias', v_own,
    'revisao', v_rev,
    'transito', v_transito,
    'entregues', v_entregues
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- RPC packing: valida alocação; grava fingerprint + status
-- ---------------------------------------------------------------------------
create or replace function public.admin_set_order_packing(
  p_order_id uuid,
  p_volumes jsonb,
  p_allocation_exception jsonb default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_order public.orders%rowtype;
  v_ship public.shipments%rowtype;
  v_meta jsonb;
  v_packing jsonb;
  v_vol jsonb;
  v_line jsonb;
  v_i int := 0;
  v_fp text;
  v_status text := 'incomplete';
  v_exc jsonb := p_allocation_exception;
  v_item record;
  v_sum numeric;
  v_alloc numeric;
  v_ok boolean := false;
begin
  if v_uid is null or not public.is_staff() then
    raise exception 'Apenas staff' using errcode = '42501';
  end if;

  if p_volumes is null or jsonb_typeof(p_volumes) is distinct from 'array' then
    raise exception 'volumes deve ser array JSON' using errcode = 'P0001';
  end if;

  select * into v_order from public.orders where id = p_order_id for update;
  if not found then
    raise exception 'Pedido nao encontrado' using errcode = 'P0001';
  end if;

  if v_order.status in ('enviado', 'entregue', 'cancelado') then
    raise exception 'Packing bloqueado apos despacho/cancelamento' using errcode = 'P0001';
  end if;

  for v_vol in select * from jsonb_array_elements(p_volumes)
  loop
    v_i := v_i + 1;
    if coalesce(v_vol->>'id', '') = '' then
      raise exception 'Volume % sem id', v_i using errcode = 'P0001';
    end if;
    if coalesce((v_vol->>'lengthCm')::numeric, 0) <= 0
       or coalesce((v_vol->>'widthCm')::numeric, 0) <= 0
       or coalesce((v_vol->>'heightCm')::numeric, 0) <= 0 then
      raise exception 'Volume %: L/A/P devem ser > 0 (cm)', v_i using errcode = 'P0001';
    end if;
    if coalesce((v_vol->>'weightKg')::numeric, 0) <= 0 then
      raise exception 'Volume %: pesoKg deve ser > 0', v_i using errcode = 'P0001';
    end if;
  end loop;

  select string_agg(x.fp, '|' order by x.fp)
  into v_fp
  from (
    select (oi.id::text || ':' || greatest(0, floor(oi.quantity))::text) as fp
    from public.order_items oi
    where oi.order_id = p_order_id
  ) x;

  if v_fp is null or v_fp = '' then
    raise exception 'Pedido sem itens para alocar' using errcode = 'P0001';
  end if;

  -- Exceção justificada → completo para filas (ainda exige dims)
  if v_exc is not null and coalesce((v_exc->>'active')::boolean, false) then
    if length(trim(coalesce(v_exc->>'reason', ''))) = 0 then
      raise exception 'Excecao de alocacao exige justificativa' using errcode = 'P0001';
    end if;
    v_exc := jsonb_build_object(
      'active', true,
      'reason', trim(v_exc->>'reason'),
      'authorizedBy', v_uid,
      'at', now()
    );
    v_status := 'exception';
    v_ok := true;
  else
    v_exc := null;
    -- Rejeita linhas órfãs / qty inválida; alocação incompleta = rascunho (incomplete)
    for v_vol in select * from jsonb_array_elements(p_volumes)
    loop
      if v_vol -> 'lines' is null or jsonb_typeof(v_vol -> 'lines') <> 'array' then
        continue;
      end if;
      for v_line in select * from jsonb_array_elements(v_vol -> 'lines')
      loop
        if coalesce((v_line->>'quantity')::numeric, 0) <= 0 then
          raise exception 'Linha de alocacao com quantidade invalida' using errcode = 'P0001';
        end if;
        if not exists (
          select 1 from public.order_items oi
          where oi.order_id = p_order_id
            and oi.id::text = coalesce(v_line->>'orderItemId', v_line->>'order_item_id', '')
        ) then
          raise exception 'Alocacao referencia item inexistente' using errcode = 'P0001';
        end if;
      end loop;
    end loop;

    v_ok := true;
    for v_item in
      select oi.id, greatest(0, floor(oi.quantity))::numeric as qty
      from public.order_items oi
      where oi.order_id = p_order_id
    loop
      v_sum := 0;
      for v_vol in select * from jsonb_array_elements(p_volumes)
      loop
        if v_vol -> 'lines' is null or jsonb_typeof(v_vol -> 'lines') <> 'array' then
          continue;
        end if;
        for v_line in select * from jsonb_array_elements(v_vol -> 'lines')
        loop
          if coalesce(v_line->>'orderItemId', v_line->>'order_item_id', '') = v_item.id::text then
            v_sum := v_sum + coalesce((v_line->>'quantity')::numeric, 0);
          end if;
        end loop;
      end loop;
      if v_sum > v_item.qty then
        raise exception 'Alocacao excedente para item % (alocado %, pedido %)',
          v_item.id, v_sum, v_item.qty using errcode = 'P0001';
      end if;
      if v_sum is distinct from v_item.qty then
        v_ok := false;
      end if;
    end loop;

    v_status := case when v_ok then 'complete' else 'incomplete' end;
  end if;

  select * into v_ship
  from public.shipments
  where order_id = p_order_id
  order by created_at asc nulls last, id asc
  limit 1
  for update;

  if not found then
    insert into public.shipments (order_id, provider, status, amount, metadata)
    values (
      p_order_id,
      'pending',
      'pending',
      coalesce(v_order.shipping_amount, 0),
      '{}'::jsonb
    )
    returning * into v_ship;
  end if;

  v_meta := coalesce(v_ship.metadata, '{}'::jsonb);
  v_packing := jsonb_build_object(
    'volumes', p_volumes,
    'updatedAt', now(),
    'updatedBy', v_uid,
    'itemsFingerprint', v_fp,
    'allocationStatus', v_status
  );
  if v_exc is not null then
    v_packing := v_packing || jsonb_build_object('allocationException', v_exc);
  end if;

  v_meta := jsonb_set(v_meta, '{packing}', v_packing, true);

  update public.shipments
  set metadata = v_meta
  where id = v_ship.id;

  perform public.emit_order_event(
    p_order_id,
    'packing_updated',
    'internal',
    jsonb_build_object(
      'volume_count', jsonb_array_length(p_volumes),
      'allocation_status', v_status,
      'packing', v_packing
    ),
    v_uid
  );

  return jsonb_build_object(
    'order_id', p_order_id,
    'shipment_id', v_ship.id,
    'packing', v_packing,
    'allocation_status', v_status,
    'complete', (v_status in ('complete', 'exception'))
  );
end;
$$;

comment on function public.admin_set_order_packing(uuid, jsonb, jsonb) is
  'Marcha 3: grava volumes + alocacao (ou excecao). Rejeita alocacao incompleta.';

revoke all on function public.admin_set_order_packing(uuid, jsonb, jsonb) from public;
grant execute on function public.admin_set_order_packing(uuid, jsonb, jsonb) to authenticated;

-- Compat: assinatura antiga (2 args) → sem exceção
create or replace function public.admin_set_order_packing(
  p_order_id uuid,
  p_volumes jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  return public.admin_set_order_packing(p_order_id, p_volumes, null);
end;
$$;

revoke all on function public.admin_set_order_packing(uuid, jsonb) from public;
grant execute on function public.admin_set_order_packing(uuid, jsonb) to authenticated;

-- ---------------------------------------------------------------------------
-- Invalidação: se qty/itens mudarem via update direto, marca invalid
-- (separated flag não mexe fingerprint)
-- ---------------------------------------------------------------------------
create or replace function public.tg_order_items_invalidate_packing()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order_id uuid;
  v_ship_id uuid;
  v_meta jsonb;
  v_fp text;
  v_expected text;
begin
  v_order_id := coalesce(new.order_id, old.order_id);

  if tg_op = 'UPDATE'
     and new.quantity is not distinct from old.quantity
     and new.product_id is not distinct from old.product_id then
    return new;
  end if;

  select s.id, s.metadata into v_ship_id, v_meta
  from public.shipments s
  where s.order_id = v_order_id
  order by s.created_at asc nulls last, s.id asc
  limit 1;

  if v_ship_id is null or v_meta -> 'packing' is null then
    return coalesce(new, old);
  end if;

  select string_agg(x.fp, '|' order by x.fp)
  into v_expected
  from (
    select (oi.id::text || ':' || greatest(0, floor(oi.quantity))::text) as fp
    from public.order_items oi
    where oi.order_id = v_order_id
  ) x;

  v_fp := coalesce(v_meta #>> '{packing,itemsFingerprint}', '');
  if v_fp <> '' and v_fp is distinct from coalesce(v_expected, '') then
    v_meta := jsonb_set(
      v_meta,
      '{packing,allocationStatus}',
      '"invalid"'::jsonb,
      true
    );
    update public.shipments set metadata = v_meta where id = v_ship_id;
  end if;

  return coalesce(new, old);
end;
$$;

drop trigger if exists trg_order_items_invalidate_packing on public.order_items;
create trigger trg_order_items_invalidate_packing
  after insert or update or delete on public.order_items
  for each row
  execute function public.tg_order_items_invalidate_packing();
