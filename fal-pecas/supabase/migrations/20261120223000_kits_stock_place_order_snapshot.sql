-- K3+K4: estoque compartilhado dos kits + snapshot de composição no pedido.
-- Sem inventory próprio do kit. Reserva/baixa expandem para componentes.

-- ---------------------------------------------------------------------------
-- order_items.kit_composition_snapshot
-- ---------------------------------------------------------------------------
alter table public.order_items
  add column if not exists kit_composition_snapshot jsonb;

comment on column public.order_items.kit_composition_snapshot is
  'Fotografia imutável da BOM do kit no momento da venda: [{product_id,sku,name,quantity}].';

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------
create or replace function public.build_kit_composition_snapshot(p_kit_product_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'product_id', c.component_product_id,
        'sku', p.sku,
        'name', p.name,
        'quantity', c.quantity
      )
      order by c.sort_order, c.created_at
    ),
    '[]'::jsonb
  )
  from public.product_kit_components c
  join public.products p on p.id = c.component_product_id
  where c.kit_product_id = p_kit_product_id;
$$;

create or replace function public.expand_sale_stock_lines(
  p_product_id uuid,
  p_qty numeric
)
returns table (stock_product_id uuid, stock_qty numeric)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_kind text;
  v_n int;
begin
  if p_qty is null or p_qty <= 0 then
    raise exception 'Quantidade inválida para expansão de estoque' using errcode = 'P0001';
  end if;

  select product_kind into v_kind from public.products where id = p_product_id;
  if v_kind is null then
    raise exception 'Produto não encontrado' using errcode = 'P0001';
  end if;

  if v_kind = 'kit' then
    select count(*)::int into v_n
    from public.product_kit_components
    where kit_product_id = p_product_id;
    if v_n = 0 then
      raise exception 'Kit sem composição' using errcode = 'P0001';
    end if;
    return query
      select c.component_product_id, (c.quantity * p_qty)::numeric
      from public.product_kit_components c
      where c.kit_product_id = p_product_id;
  else
    stock_product_id := p_product_id;
    stock_qty := p_qty;
    return next;
  end if;
end;
$$;

create or replace function public.product_sellable_units(p_product_id uuid)
returns numeric
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_kind text;
  v_min numeric;
  r record;
  v_avail numeric;
begin
  select product_kind into v_kind from public.products where id = p_product_id;
  if v_kind is null then
    return 0;
  end if;

  if v_kind <> 'kit' then
    select coalesce(i.quantity_on_hand, 0) - coalesce(i.quantity_reserved, 0)
    into v_avail
    from public.inventory i
    where i.product_id = p_product_id;
    return greatest(coalesce(v_avail, 0), 0);
  end if;

  v_min := null;
  for r in
    select c.component_product_id, c.quantity
    from public.product_kit_components c
    where c.kit_product_id = p_product_id
  loop
    select coalesce(i.quantity_on_hand, 0) - coalesce(i.quantity_reserved, 0)
    into v_avail
    from public.inventory i
    where i.product_id = r.component_product_id;
    v_avail := greatest(coalesce(v_avail, 0), 0);
    if r.quantity <= 0 then
      return 0;
    end if;
    v_avail := floor(v_avail / r.quantity);
    if v_min is null or v_avail < v_min then
      v_min := v_avail;
    end if;
  end loop;

  return coalesce(v_min, 0);
end;
$$;

create or replace function public.compute_kit_is_available(p_kit_product_id uuid)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_mode text;
  v_n int;
begin
  select count(*)::int into v_n
  from public.product_kit_components
  where kit_product_id = p_kit_product_id;
  if v_n = 0 then
    return false;
  end if;

  v_mode := public.get_store_inventory_mode();
  if v_mode = 'com_estoque' then
    return public.product_sellable_units(p_kit_product_id) > 0;
  end if;

  -- sem_estoque / demais: todos os componentes publicados e disponíveis
  return not exists (
    select 1
    from public.product_kit_components c
    join public.products p on p.id = c.component_product_id
    where c.kit_product_id = p_kit_product_id
      and (p.status <> 'published' or p.is_available is not true)
  );
end;
$$;

create or replace function public.refresh_kits_using_product(p_product_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  r record;
  v_avail boolean;
begin
  for r in
    select distinct kit_product_id
    from public.product_kit_components
    where component_product_id = p_product_id
       or kit_product_id = p_product_id
  loop
    v_avail := public.compute_kit_is_available(r.kit_product_id);
    update public.products
    set is_available = v_avail, updated_at = now()
    where id = r.kit_product_id
      and is_available is distinct from v_avail;
  end loop;

  -- se o próprio produto é kit
  if exists (select 1 from public.products where id = p_product_id and product_kind = 'kit') then
    v_avail := public.compute_kit_is_available(p_product_id);
    update public.products
    set is_available = v_avail, updated_at = now()
    where id = p_product_id
      and is_available is distinct from v_avail;
  end if;
end;
$$;

create or replace function public.trg_refresh_kits_on_inventory()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.refresh_kits_using_product(new.product_id);
  return new;
end;
$$;

drop trigger if exists inventory_refresh_kits_trg on public.inventory;
create trigger inventory_refresh_kits_trg
  after insert or update on public.inventory
  for each row execute function public.trg_refresh_kits_on_inventory();

create or replace function public.trg_refresh_kits_on_component_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'DELETE' then
    perform public.refresh_kits_using_product(old.kit_product_id);
    return old;
  end if;
  perform public.refresh_kits_using_product(new.kit_product_id);
  return new;
end;
$$;

drop trigger if exists kit_components_refresh_avail_trg on public.product_kit_components;
create trigger kit_components_refresh_avail_trg
  after insert or update or delete on public.product_kit_components
  for each row execute function public.trg_refresh_kits_on_component_change();

create or replace function public.trg_refresh_kits_on_product_avail()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.is_available is distinct from old.is_available
     or new.status is distinct from old.status then
    perform public.refresh_kits_using_product(new.id);
  end if;
  return new;
end;
$$;

drop trigger if exists products_refresh_kits_avail_trg on public.products;
create trigger products_refresh_kits_avail_trg
  after update of is_available, status on public.products
  for each row execute function public.trg_refresh_kits_on_product_avail();

-- ---------------------------------------------------------------------------
-- Reserva / assert (com_estoque)
-- ---------------------------------------------------------------------------
create or replace function public.assert_sale_stock(
  p_product_id uuid,
  p_qty numeric,
  p_sku text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  r record;
  v_avail numeric;
begin
  for r in
    select * from public.expand_sale_stock_lines(p_product_id, p_qty)
  loop
    select coalesce(i.quantity_on_hand, 0) - coalesce(i.quantity_reserved, 0)
    into v_avail
    from public.inventory i
    where i.product_id = r.stock_product_id
    for update;

    if v_avail is null or v_avail < r.stock_qty then
      raise exception 'Estoque insuficiente: %', p_sku using errcode = 'P0001';
    end if;
  end loop;
end;
$$;

create or replace function public.reserve_sale_stock(
  p_product_id uuid,
  p_qty numeric,
  p_order_id uuid,
  p_user_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  r record;
begin
  for r in
    select * from public.expand_sale_stock_lines(p_product_id, p_qty)
  loop
    insert into public.inventory (product_id, quantity_on_hand, quantity_reserved)
    values (r.stock_product_id, 0, 0)
    on conflict (product_id) do nothing;

    update public.inventory
    set quantity_reserved = quantity_reserved + r.stock_qty, updated_at = now()
    where product_id = r.stock_product_id;

    insert into public.inventory_movements (
      product_id, type, quantity, reason, order_id, user_id
    )
    values (
      r.stock_product_id, 'reserve', r.stock_qty, 'place_order', p_order_id, p_user_id
    );
  end loop;
end;
$$;

-- Expande demanda a partir do snapshot do item (ou BOM atual se snapshot ausente).
create or replace function public.expand_order_item_stock_lines(
  p_product_id uuid,
  p_qty numeric,
  p_snapshot jsonb
)
returns table (stock_product_id uuid, stock_qty numeric)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  elem jsonb;
begin
  if p_snapshot is not null
     and jsonb_typeof(p_snapshot) = 'array'
     and jsonb_array_length(p_snapshot) > 0 then
    for elem in select * from jsonb_array_elements(p_snapshot)
    loop
      stock_product_id := nullif(elem ->> 'product_id', '')::uuid;
      stock_qty := coalesce((elem ->> 'quantity')::numeric, 0) * p_qty;
      if stock_product_id is not null and stock_qty > 0 then
        return next;
      end if;
    end loop;
    return;
  end if;

  return query select * from public.expand_sale_stock_lines(p_product_id, p_qty);
end;
$$;

create or replace function public.fulfill_order_reservations(p_order_id uuid, p_user_id uuid default null)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  oi record;
  r record;
begin
  for oi in
    select product_id, quantity, kit_composition_snapshot
    from public.order_items
    where order_id = p_order_id and product_id is not null
  loop
    for r in
      select *
      from public.expand_order_item_stock_lines(
        oi.product_id, oi.quantity, oi.kit_composition_snapshot
      )
    loop
      update public.inventory inv
      set
        quantity_reserved = greatest(0, inv.quantity_reserved - r.stock_qty),
        quantity_on_hand = inv.quantity_on_hand - r.stock_qty,
        updated_at = now()
      where inv.product_id = r.stock_product_id
        and inv.quantity_on_hand >= r.stock_qty;

      if not found then
        raise exception 'Estoque insuficiente para baixa do produto %', r.stock_product_id
          using errcode = 'P0001';
      end if;

      insert into public.inventory_movements (product_id, type, quantity, reason, order_id, user_id)
      values (r.stock_product_id, 'out', r.stock_qty, 'order_shipped', p_order_id, p_user_id);
    end loop;
  end loop;
end;
$$;

create or replace function public.release_order_reservations(p_order_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  oi record;
  r record;
  v_mode text;
begin
  select coalesce(o.inventory_mode_at_order, 'com_estoque') into v_mode
  from public.orders o where o.id = p_order_id;
  if v_mode is null then return; end if;
  if v_mode <> 'com_estoque' then return; end if;

  for oi in
    select product_id, quantity, kit_composition_snapshot
    from public.order_items
    where order_id = p_order_id and product_id is not null
  loop
    for r in
      select *
      from public.expand_order_item_stock_lines(
        oi.product_id, oi.quantity, oi.kit_composition_snapshot
      )
    loop
      update public.inventory i
      set quantity_reserved = greatest(0, i.quantity_reserved - r.stock_qty),
          updated_at = now()
      where i.product_id = r.stock_product_id;

      insert into public.inventory_movements (product_id, type, quantity, reason, order_id, user_id)
      values (
        r.stock_product_id, 'release', r.stock_qty, 'payment_failed_or_cancel', p_order_id, auth.uid()
      );
    end loop;
  end loop;
end;
$$;

revoke all on function public.build_kit_composition_snapshot(uuid) from public;
grant execute on function public.build_kit_composition_snapshot(uuid) to anon, authenticated;
revoke all on function public.product_sellable_units(uuid) from public;
grant execute on function public.product_sellable_units(uuid) to anon, authenticated;
revoke all on function public.compute_kit_is_available(uuid) from public;
grant execute on function public.compute_kit_is_available(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- Patch cirúrgico place_order_core_hybrid
-- ---------------------------------------------------------------------------
do $patch$
declare
  src text;
begin
  src := pg_get_functiondef('public.place_order_core_hybrid(jsonb)'::regprocedure);

  -- 1) assert estoque (itens e kits)
  if position('assert_sale_stock(' in src) = 0 then
    src := replace(
      src,
      $old$
    if v_track then
      select coalesce(i.quantity_on_hand, 0) - coalesce(i.quantity_reserved, 0)
      into v_avail
      from public.inventory i
      where i.product_id = v_product_id
      for update;
      if v_avail is null or v_avail < v_qty then
        raise exception 'Estoque insuficiente: %', v_prod.sku using errcode = 'P0001';
      end if;
    end if;
$old$,
      $new$
    if v_track then
      perform public.assert_sale_stock(v_product_id, v_qty, v_prod.sku);
    end if;
$new$
    );
  end if;

  -- 2) insert order_items com snapshot de kit
  if position('kit_composition_snapshot' in src) = 0 then
    src := replace(
      src,
      $old$
    insert into public.order_items (
      order_id, product_id, sku, name_snapshot, unit_price, quantity, price_list_id,
      customer_vehicle_id, vehicle_snapshot
    )
    values (
      v_order_id, v_product_id, v_sku, v_name, v_unit, v_qty, v_price_list_id,
      nullif(v_item ->> 'customer_vehicle_id', '')::uuid,
      case
        when jsonb_typeof(v_item -> 'vehicle_snapshot') = 'object' then v_item -> 'vehicle_snapshot'
        else null
      end
    );
$old$,
      $new$
    insert into public.order_items (
      order_id, product_id, sku, name_snapshot, unit_price, quantity, price_list_id,
      customer_vehicle_id, vehicle_snapshot, kit_composition_snapshot
    )
    values (
      v_order_id, v_product_id, v_sku, v_name, v_unit, v_qty, v_price_list_id,
      nullif(v_item ->> 'customer_vehicle_id', '')::uuid,
      case
        when jsonb_typeof(v_item -> 'vehicle_snapshot') = 'object' then v_item -> 'vehicle_snapshot'
        else null
      end,
      case
        when exists (
          select 1 from public.products pk
          where pk.id = v_product_id and pk.product_kind = 'kit'
        )
        then public.build_kit_composition_snapshot(v_product_id)
        else null
      end
    );
$new$
    );
  end if;

  -- 3) reserva expandida
  if position('reserve_sale_stock(' in src) = 0 then
    src := replace(
      src,
      $old$
    if v_track then
      update public.inventory
      set quantity_reserved = quantity_reserved + v_qty, updated_at = now()
      where product_id = v_product_id;
      insert into public.inventory_movements (
        product_id, type, quantity, reason, order_id, user_id
      )
      values (v_product_id, 'reserve', v_qty, 'place_order', v_order_id, v_uid);
    end if;
$old$,
      $new$
    if v_track then
      perform public.reserve_sale_stock(v_product_id, v_qty, v_order_id, v_uid);
    end if;
$new$
    );
  end if;

  if position('assert_sale_stock(' in src) = 0
     or position('reserve_sale_stock(' in src) = 0
     or position('kit_composition_snapshot' in src) = 0 then
    raise exception 'K3/K4 patch place_order_core_hybrid falhou: trechos não encontrados';
  end if;

  execute src;
end;
$patch$;
