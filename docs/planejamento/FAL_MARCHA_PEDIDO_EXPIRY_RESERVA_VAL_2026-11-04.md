# VAL — MARCHA_PEDIDO_EXPIRY_RESERVA

**Data:** 2026-11-04  
**Auth:** MARCHA (M1 pós M0)  
**Runtime:** `wtbpwuiayednvlhvuhbh`  
**D-FRETE:** **B** (inalterado)

---

## Escopo

Expirar pedidos `aguardando_pagamento` além do **TTL de idade do pedido** (default **48 h**), cancelar + liberar reserva (`release_order_reservations`).  
**Fora:** cron automático em produção (botão staff + RPC `service_role` prontos); D-FRETE C; Melhor Envio.

### Decisão

`payments.expires_at` (QR Pix) **≠** cancelamento do pedido — cliente pode gerar novo QR em Meus Pedidos dentro das 48 h.

---

## Entrega (FATO)

| Item | Estado |
|------|--------|
| RPC `expire_unpaid_orders(limit, max_age_hours)` | OK · apply wtbp |
| Release reserva no cancel | OK (F7F) |
| Payments `created`/`pending` → `expired` | OK |
| Eventos `order_expired_unpaid` + `order_cancelled` | OK |
| Gate gerente/admin se `auth.uid()` presente | OK |
| `adminExpireUnpaidOrders` + botão `/admin/pedidos` | OK |
| `tsc --noEmit` | PASS |
| Smoke SQL `expire_unpaid_orders(10, 8760)` | **PASS** → `expired: 0` (idade clamp max 720 h) |
| PR #48 → `main` | **PASS** · `ca4d58c` |

### Arquivos

- `fal-pecas/supabase/migrations/20261104170000_expire_unpaid_orders.sql`
- `fal-pecas/src/services/admin/adminOrderService.ts`
- `fal-pecas/src/pages/admin/orders/AdminOrdersPage.tsx`

---

## Aceite

1. Pedido novo (< 48 h) não é cancelado pela RPC.  
2. Pedido `aguardando_pagamento` com idade > TTL → `cancelado` + reserva liberada.  
3. Staff não-gerente recebe erro de permissão.  
4. UI: botão «Expirar não pagos (48 h)» com confirm.

---

## Follow-ups

- Agendar cron Supabase (`service_role`) a cada 15–30 min  
- `MARCHA_PEDIDOS_OPS_CONFIRMACAO_SEPARACAO`  
- TTL configurável em settings (se operação pedir)

**Resultado:** **PASS** (SQL wtbp + UI). Deploy = PR/Netlify.

**Assinatura agente:** VAL pedido expiry reserva 2026-11-04.
