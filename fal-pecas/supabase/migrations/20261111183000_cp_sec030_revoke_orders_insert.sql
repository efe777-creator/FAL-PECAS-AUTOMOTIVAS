-- CP-SEC-030: impedir INSERT direto em orders/order_items via PostgREST/JWT.
-- Criação de pedido permanece exclusiva em public.place_order (SECURITY DEFINER).
-- Espelha o padrão de 20261004160000 (revoke UPDATE em orders).
-- Inventário: docs/planejamento/FAL_MARCHA_CENTRAL_PEDIDOS_SEC030_INVENTARIO_2026-11-11.md

drop policy if exists orders_insert_own on public.orders;

revoke insert on public.orders from authenticated;
revoke insert on public.orders from anon;

revoke insert on public.order_items from authenticated;
revoke insert on public.order_items from anon;

comment on table public.orders is
  'Pedidos. INSERT via JWT revogado (CP-SEC-030); criação só por place_order SECURITY DEFINER. UPDATE JWT já revogado (F7).';
