-- PLANO 1 / G6: snapshot imutável veículo em cart_items / order_items (§6.3).

alter table public.cart_items
  add column if not exists customer_vehicle_id uuid
    references public.customer_vehicles (id) on delete set null,
  add column if not exists vehicle_snapshot jsonb;

alter table public.order_items
  add column if not exists customer_vehicle_id uuid
    references public.customer_vehicles (id) on delete set null,
  add column if not exists vehicle_snapshot jsonb;

comment on column public.cart_items.vehicle_snapshot is
  'Snapshot do veículo no add-to-cart (contextSource active|manual|suggested).';
comment on column public.order_items.vehicle_snapshot is
  'Snapshot congelado na criação do pedido — não reconsultar garagem.';

create index if not exists cart_items_customer_vehicle_idx
  on public.cart_items (customer_vehicle_id)
  where customer_vehicle_id is not null;

create index if not exists order_items_customer_vehicle_idx
  on public.order_items (customer_vehicle_id)
  where customer_vehicle_id is not null;
