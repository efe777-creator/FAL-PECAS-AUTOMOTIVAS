# Inventário CP-SEC-030 — INSERT JWT em `orders`

**Data:** 2026-11-11  
**Projeto:** `wtbpwuiayednvlhvuhbh`  
**Auth:** eFe — MARCHA P0-2 (inventário antes de revoke)  
**Escopo:** paths que criam linhas em `orders` / `order_items`. Sem estoque.

## Veredito do inventário

**Seguro revogar** `INSERT` JWT em `orders` (e grant residual em `order_items`).  
Único path legítimo de criação: RPC `place_order` (`SECURITY DEFINER`).  
Nenhum FE/Edge autenticado depende de PostgREST INSERT em `orders`.

---

## 1. Frontend

| Path | Operação | Achado |
|------|----------|--------|
| `placeOrderService.ts` → `rpc('place_order')` | Criação canônica | **Único** caminho de checkout |
| `CheckoutPage.tsx` | chama `placeOrder` | OK |
| `adminOrderService` / `orderDetailService` / `orderQueryService` / `adminCustomerService` | `.from('orders')` | **só SELECT** |
| Busca literal `.from('orders').insert` no `src/` | — | **0 ocorrências** |

## 2. Edge Functions (service_role)

| Função | `orders` | Nota |
|--------|----------|------|
| `create-mp-payment` | SELECT | insert em `payments` |
| `mercado-pago-webhook` | SELECT | insert em `payment_events` |
| `melhorenvio-label` | SELECT | insert/update `shipments` (service_role) |
| `quote-shipping` / `quote-own-delivery` | — | `shipping_quotes` |

**Nenhuma Edge faz INSERT em `orders`.**

## 3. RPCs / SQL

| Função | Definer | INSERT `orders` |
|--------|---------|-----------------|
| `public.place_order(jsonb)` | **SECURITY DEFINER** | Sim (canônico) |
| Demais F7 (`transition_*`, `ship_order`, …) | DEFINER | UPDATE/ops — sem create |

Migrations que reescrevem `place_order` (histórico): F6 → F9-F → ME → ownq → fix `v_ship_provider` (`20261105140000_…`).

## 4. Grants / RLS (estado atual pré-revoke)

| Item | Evidência |
|------|-----------|
| `grant insert on public.orders to authenticated` | `20261003180000_fase2_schema_rls.sql` |
| `grant insert on public.order_items to authenticated` | idem |
| Policy `orders_insert_own` | `customer_id = current_customer_id() OR is_staff()` |
| Policy INSERT em `order_items` | **ausente** (só SELECT) — grant INSERT inútil/residual |
| UPDATE JWT em `orders` | **já revogado** (`20261004160000_fase7_orders_revoke_direct_update.sql`) |
| Smoke anon INSERT `orders` | RLS/`current_customer_id` (path PostgREST POST exposto; role `anon` sem fluxo útil) |
| Smoke anon `place_order` | **401** Não autenticado (esperado) |

**Risco:** JWT `authenticated` com `customer_id` próprio pode PostgREST-INSERT pedido **fora** de `place_order` (sem preço/frete/idempotência server-side).

## 5. CP-SEC-035 (inventário rápido — paralelo)

| Path | Achado |
|------|--------|
| FE `.from('shipments').(insert\|update)` | **0** |
| Edge `melhorenvio-label` | service_role insert/update `metadata.me` |
| `place_order` | insert shipment inicial |
| RLS `shipments_staff_write` | staff ALL ainda aberto via JWT |

Revoke de write JWT em `shipments` = ticket **CP-SEC-035** (não misturar neste revoke de `orders`).

## 6. Plano de revoke (após este inventário)

1. Migration: `revoke insert on orders/order_items from authenticated, anon` + `drop policy orders_insert_own`.  
2. Smoke: INSERT JWT falha · `place_order` autenticado OK · admin SELECT OK · docs privados OK.  
3. Só então marcar CP-SEC-030 **corrigido**.

## Assinatura inventário

Inventário completo · FE/Edge/RPC/grants/RLS · **GO para revoke** · 2026-11-11
