-- PLANO 1 / G7: histórico append-only de peças por veículo (§6.2 / R6).

create table if not exists public.customer_vehicle_part_events (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.customers (id) on delete cascade,
  customer_vehicle_id uuid references public.customer_vehicles (id) on delete set null,
  order_id uuid references public.orders (id) on delete set null,
  order_item_id uuid references public.order_items (id) on delete set null,
  product_id uuid references public.products (id) on delete set null,
  event_type text not null
    check (event_type in (
      'bought',
      'associated',
      'awaiting_install',
      'installed_declared',
      'returned',
      'corrected',
      'disassociated'
    )),
  payload jsonb not null default '{}'::jsonb,
  actor_id uuid references auth.users (id) on delete set null,
  provenance text not null default 'system'
    check (provenance in ('customer', 'system')),
  created_at timestamptz not null default now()
);

comment on table public.customer_vehicle_part_events is
  'G7: timeline append-only. Proibido UPDATE de event_type (ex. bought→installed).';

create index if not exists cvpe_vehicle_created_idx
  on public.customer_vehicle_part_events (customer_vehicle_id, created_at desc);

create index if not exists cvpe_customer_created_idx
  on public.customer_vehicle_part_events (customer_id, created_at desc);

create index if not exists cvpe_order_idx
  on public.customer_vehicle_part_events (order_id)
  where order_id is not null;

-- Idempotência: um bought/associated por order_item.
create unique index if not exists cvpe_order_item_bought_uidx
  on public.customer_vehicle_part_events (order_item_id)
  where order_item_id is not null and event_type = 'bought';

create unique index if not exists cvpe_order_item_associated_uidx
  on public.customer_vehicle_part_events (order_item_id)
  where order_item_id is not null and event_type = 'associated';

alter table public.customer_vehicle_part_events enable row level security;

drop policy if exists cvpe_select_own on public.customer_vehicle_part_events;
create policy cvpe_select_own on public.customer_vehicle_part_events
  for select to authenticated
  using (customer_id = public.current_customer_id() or public.is_staff());

drop policy if exists cvpe_insert_own on public.customer_vehicle_part_events;
create policy cvpe_insert_own on public.customer_vehicle_part_events
  for insert to authenticated
  with check (
    customer_id = public.current_customer_id()
    and provenance = 'customer'
    and event_type in (
      'associated',
      'awaiting_install',
      'installed_declared',
      'returned',
      'corrected',
      'disassociated'
    )
  );

-- Sem UPDATE/DELETE para authenticated (append-only).
revoke all on public.customer_vehicle_part_events from public;
grant select, insert on public.customer_vehicle_part_events to authenticated;

-- Bloqueia UPDATE/DELETE mesmo via service/staff acidental na app.
create or replace function public.cvpe_forbid_mutate()
returns trigger
language plpgsql
as $$
begin
  raise exception 'customer_vehicle_part_events is append-only (no %)', tg_op
    using errcode = 'check_violation';
end;
$$;

drop trigger if exists cvpe_forbid_update on public.customer_vehicle_part_events;
create trigger cvpe_forbid_update
  before update on public.customer_vehicle_part_events
  for each row execute function public.cvpe_forbid_mutate();

drop trigger if exists cvpe_forbid_delete on public.customer_vehicle_part_events;
create trigger cvpe_forbid_delete
  before delete on public.customer_vehicle_part_events
  for each row execute function public.cvpe_forbid_mutate();

-- Registra bought (+ associated se houver snapshot) quando o pedido entra no ciclo pago.
create or replace function public.record_order_vehicle_part_events(p_order_id uuid)
returns integer
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_customer_id uuid;
  v_count integer := 0;
  r record;
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
        r.customer_vehicle_id,
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

    if (r.customer_vehicle_id is not null or r.vehicle_snapshot is not null)
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
        r.customer_vehicle_id,
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

revoke all on function public.record_order_vehicle_part_events(uuid) from public;
grant execute on function public.record_order_vehicle_part_events(uuid) to service_role;
grant execute on function public.record_order_vehicle_part_events(uuid) to authenticated;

comment on function public.record_order_vehicle_part_events(uuid) is
  'G7: grava bought (+ associated se snapshot) de forma idempotente para o pedido pago.';

create or replace function public.trg_orders_record_vehicle_part_events()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_paid text[] := array[
    'pagamento_aprovado',
    'recebido',
    'em_analise',
    'aguardando_disponibilidade',
    'em_separacao',
    'separado',
    'pronto_para_envio',
    'enviado',
    'entregue'
  ];
begin
  if tg_op = 'UPDATE'
     and new.status is distinct from old.status
     and new.status = any (v_paid)
     and (old.status is null or not (old.status = any (v_paid)))
  then
    perform public.record_order_vehicle_part_events(new.id);
  end if;
  return new;
end;
$$;

drop trigger if exists orders_record_vehicle_part_events on public.orders;
create trigger orders_record_vehicle_part_events
  after update of status on public.orders
  for each row
  execute function public.trg_orders_record_vehicle_part_events();
