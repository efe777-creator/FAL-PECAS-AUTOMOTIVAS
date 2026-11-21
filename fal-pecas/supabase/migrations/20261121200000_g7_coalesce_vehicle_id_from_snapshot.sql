-- Fundação garagem 2026-11-21: G7 bought/associated usam customer_vehicle_id
-- COALESCE(coluna, snapshot->>'customerVehicleId') para não orphanar compras.

create or replace function public.record_order_vehicle_part_events(p_order_id uuid)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_customer_id uuid;
  v_count integer := 0;
  r record;
  v_cv_id uuid;
begin
  select o.customer_id into v_customer_id
  from public.orders o
  where o.id = p_order_id;

  if v_customer_id is null then
    return 0;
  end if;

  for r in
    select
      oi.id as order_item_id,
      oi.product_id,
      oi.sku,
      oi.name_snapshot,
      oi.quantity,
      oi.unit_price,
      oi.customer_vehicle_id,
      oi.vehicle_snapshot
    from public.order_items oi
    where oi.order_id = p_order_id
  loop
    v_cv_id := coalesce(
      r.customer_vehicle_id,
      nullif(r.vehicle_snapshot->>'customerVehicleId', '')::uuid
    );

    -- Só aceita membership do mesmo cliente
    if v_cv_id is not null and not exists (
      select 1
      from public.customer_vehicles cv
      where cv.id = v_cv_id
        and cv.customer_id = v_customer_id
    ) then
      v_cv_id := null;
    end if;

    if not exists (
      select 1
      from public.customer_vehicle_part_events e
      where e.order_item_id = r.order_item_id
        and e.event_type = 'bought'
    ) then
      insert into public.customer_vehicle_part_events (
        customer_id,
        customer_vehicle_id,
        order_id,
        order_item_id,
        product_id,
        event_type,
        payload,
        actor_id,
        provenance
      )
      values (
        v_customer_id,
        v_cv_id,
        p_order_id,
        r.order_item_id,
        r.product_id,
        'bought',
        jsonb_build_object(
          'sku', r.sku,
          'name', r.name_snapshot,
          'quantity', r.quantity,
          'unitPrice', r.unit_price,
          'vehicleSnapshot', r.vehicle_snapshot
        ),
        null,
        'system'
      );
      v_count := v_count + 1;
    end if;

    if (v_cv_id is not null or r.vehicle_snapshot is not null)
       and not exists (
         select 1
         from public.customer_vehicle_part_events e
         where e.order_item_id = r.order_item_id
           and e.event_type = 'associated'
       )
    then
      insert into public.customer_vehicle_part_events (
        customer_id,
        customer_vehicle_id,
        order_id,
        order_item_id,
        product_id,
        event_type,
        payload,
        actor_id,
        provenance
      )
      values (
        v_customer_id,
        v_cv_id,
        p_order_id,
        r.order_item_id,
        r.product_id,
        'associated',
        jsonb_build_object(
          'sku', r.sku,
          'name', r.name_snapshot,
          'quantity', r.quantity,
          'vehicleSnapshot', r.vehicle_snapshot,
          'source', 'order_paid'
        ),
        null,
        'system'
      );
      v_count := v_count + 1;
    end if;
  end loop;

  return v_count;
end;
$$;

comment on function public.record_order_vehicle_part_events(uuid) is
  'G7: grava bought (+ associated). cv_id = coalesce(order_item, snapshot) com ownership check.';
