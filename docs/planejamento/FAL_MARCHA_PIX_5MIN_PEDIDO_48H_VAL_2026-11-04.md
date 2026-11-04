# VAL — Pix 5 min × Pedido 48 h

**Data:** 2026-11-04  
**Branch:** `feat/central-pedidos-me-sandbox-2026-11-04`  
**Premissa:** dois TTLs distintos; sem hard delete de pedido; sem deploy nesta entrega.

---

## Regras

| Camada | TTL | Efeito |
|--------|-----|--------|
| Cobrança **Pix** | **5 minutos** | QR/`expires_at` expira; payment → `expired` na próxima geração; **pedido permanece** `aguardando_pagamento` |
| **Pedido** sem pagamento aprovado | **48 horas** | `expire_unpaid_orders` → status `cancelado`, reserva liberada — **retirado da fila operacional** (histórico mantido) |

Dentro das 48 h o cliente pode gerar **novo Pix** ou pagar no **cartão** (`ResumeOrderPaymentPanel` / `create-mp-payment`).

---

## Implementação

- `mpCreatePaymentCore`: `PIX_PAYMENT_TTL_MINUTES=5`, `date_of_expiration` no body Pix, helpers countdown
- Edge `create-mp-payment`: se pending com `expires_at` vencido → marca `expired` e cria nova cobrança
- UI: contador `MM:SS` em `MercadoPagoPixPanel`; copy Meus pedidos / checkout / admin
- 48 h: RPC já existente; botões admin “Retirar não pagos (48 h)”

## Não feito / fora

- Hard delete de pedidos (proibido — histórico)
- Deploy Edge `create-mp-payment` (necessário em prod/sandbox para TTL valer no MP)
- Nova migration (não necessária)

## Aceite

- [x] Pix 5 min no body + fallback `expires_at`
- [x] Contador na UI
- [x] Expirar Pix ≠ cancelar pedido
- [x] Retomar Pix/cartão nas 48 h
- [x] 48 h cancela/retira da fila (RPC existente)
- [x] Testes unitários TTL + `tsc`
