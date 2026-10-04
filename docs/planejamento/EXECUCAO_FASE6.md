# Execução Fase 6 — E-commerce

**Branch:** `plan`  
**Spec:** [ESPECIFICACAO_FASE6_ECOMMERCE.md](./ESPECIFICACAO_FASE6_ECOMMERCE.md)  
**Auditoria:** [AUDITORIA_FASE6_2026-10-03.md](./AUDITORIA_FASE6_2026-10-03.md)

## Checklist

| Módulo | Conteúdo | Status |
|--------|----------|--------|
| M1 | Tipos / contratos TS (`Shipping*`, `Payment*`, `PlaceOrder*`, `OrderDetail`) | [x] |
| M2 | Migration RLS/RPC (`place_order`, idempotency, checks, confirm) | [x] |
| M3 | Cart sync (`carts`/`cart_items` + merge local→auth) | [x] |
| M4 | Shipping mock (`MockShippingProvider`, ≥2 opções) | [x] |
| M5 | Payment simulated (`PaymentProviderSimulated`) | [x] |
| **M6** | **placeOrder** — atomicidade, recálculo, reserva, idempotência, snapshots | [x] |
| M7 | Checkout UI (steps + ProtectedRoute) | [x] |
| M8 | Detalhe do pedido (`/conta/pedidos/:id`) | [x] |
| M9 | Docs / smoke / build | [x] |

## M6 placeOrder — requisitos

| Requisito | Entrega |
|-----------|----------|
| Atomicidade | RPC `place_order` — order + items + history + payment + shipment + reserva + limpa carrinho |
| Recálculo server-side | Preços e frete recalculados no SQL |
| Reserva transacional | `quantity_reserved` + `inventory_movements.reserve` |
| Idempotência | `orders.idempotency_key` unique por customer |
| Snapshots | `address_snapshot` + item snapshots + shipment/payment metadata |

## Migration

Local: `fal-pecas/supabase/migrations/20261004010000_fase6_ecommerce.sql`  
Remoto (MCP): `fase6_ecommerce_schema_shipping`, `fase6_place_order_rpc`, `fase6_confirm_simulated_payment`

## Rotas

- `/checkout` — protegida  
- `/conta/pedidos/:id` — detalhe  
- `/carrinho` — CTA checkout / login

## Services

```
src/services/cart/supabaseCartService.ts
src/services/shipping/{shippingService,mockShippingProvider}.ts
src/services/payments/{paymentService,simulatedPaymentProvider}.ts
src/services/orders/{placeOrderService,orderDetailService}.ts
```

## Checkpoints

- [x] Spec aprovada / implementação  
- [x] M1–M8 implementados  
- [x] `npm run build` OK  
- [x] Auditoria `AUDITORIA_FASE6_2026-10-03.md`
