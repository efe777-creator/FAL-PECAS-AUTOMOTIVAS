# Relatório final F9-B — Mercado Pago Create Payment (Sandbox)

**Data:** 2026-10-06  
**Status:** **F9-B DONE** (core + conformidade Prompt Mestre)  
**STOP:** não iniciar F9-C até nova MARCHA.

---

## Entrega final (§30) — 17 itens

### 1. Auditoria realizada

[AUDITORIA_F9B_PRE_IMPL_2026-10-06.md](./AUDITORIA_F9B_PRE_IMPL_2026-10-06.md) — git + F9-A + gaps + docs MP.

### 2. Documentação MP utilizada

- [Create payment](https://www.mercadopago.com.br/developers/pt/reference/online-payments/checkout-api-payments/create-payment/post)
- [Integrar Pix](https://www.mercadopago.com.br/developers/pt/docs/checkout-api-payments/integration-configuration/integrate-pix)
- [Credenciais](https://www.mercadopago.com.br/developers/pt/docs/checkout-api-orders/resources/credentials)

### 3. Arquivos criados/alterados (gap-close conform)

| Arquivo | Papel |
|---------|-------|
| `fal-pecas/src/services/payments/mpCreatePaymentCore.ts` | Parse body só `orderId`; `serverPaymentMethod=pix`; map MP sem approve |
| `fal-pecas/src/services/payments/createMpPaymentFlow.ts` | Handler testável A–I (deps injetáveis + fetch mock) |
| `fal-pecas/src/services/payments/createMpPaymentFlow.test.ts` | Casos A–I |
| `fal-pecas/src/services/payments/mpCreatePaymentCore.test.ts` | Testes puros core |
| `fal-pecas/src/services/payments/mpCreatePaymentService.ts` | FE fino `{ orderId }` only |
| `fal-pecas/supabase/functions/_shared/mpCreatePaymentCore.ts` | Sync Edge |
| `fal-pecas/supabase/functions/create-mp-payment/index.ts` | Edge JWT + ownership + MP |
| Docs checklist / relatório / STOP | Conformidade §22–30 |

### 4. Edge Function

`supabase/functions/create-mp-payment` — JWT, ownership, `aguardando_pagamento`, amount = `orders.total`, rejeita amount/method do FE, `X-Idempotency-Key`, reuso pending, `MP_ACCESS_TOKEN missing`, **não** chama `transition_order_status`.

### 5. Fluxo implementado

```text
FE createMercadoPagoPayment(orderId)
  → Edge create-mp-payment (JWT)
  → valida order + ownership + status
  → amount = orders.total (server)
  → POST MP /v1/payments (Bearer secret)
  → persiste provider_* / method pix / status interno pending
  → response { …, orderApproved: false }
```

### 6. Estratégia de idempotência

`X-Idempotency-Key` = `fal-pay-{paymentId}` (estável por registro `payments`). Pending com `provider_payment_id` → reuso sem novo POST MP.

### 7. Estratégia de amount server-side

Body FE **somente** `{ orderId }`. `amount` / `method` / campos financeiros do client → **400**. Valor MP = `orders.total`.

### 8. Testes

`npm test -- --run src/services/payments` → **28 PASS** (incl. A–I).

### 9. Build

`npm run build` → **PASS**.

### 10. Regressão F7/F8

Diff vs `origin/main` **não** toca `CheckoutPage`, `place_order`, inventory, `transition_order_status`, ship/deliver.

### 11. Security scan

Ver [CHECKLIST_F9B…](./CHECKLIST_F9B_MP_CREATE_PAYMENT.md) § security — sem `VITE_MP_ACCESS*`, sem token hardcoded, `MP_ACCESS_TOKEN` só via env/secret.

### 12. Commit hash

*(preenchido no promote — tip do commit de conformidade)*

### 13. Push

Branch `feat/f9-b-mp-create-payment-conform` → origin.

### 14. PR

PR de conformidade → `main` (padrão do repo via `dev` se aplicável).

### 15. Merge

Core F9-B: PR **#6** @ `06be4e4`. Gap-close: PR deste pacote.

### 16. Estado final main / dev / plan

| Branch | Tip (atualizar pós-merge) |
|--------|---------------------------|
| `main` | pós-merge conform |
| `dev` | pós-merge conform |
| `plan` | docs STOP + checklist + relatório |

### 17. STOP F9-B

**PARAR.** Não webhook · não Pix UI · não SDK · não produção · não F9-C até `MARCHA F9-C`.

Ver [STOP_F9_MP…](./STOP_F9_MP_POS_AUDITORIA_2026-10-06.md).
