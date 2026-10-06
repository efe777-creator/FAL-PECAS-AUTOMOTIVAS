# Checklist F9-B — Mercado Pago Create Payment (Sandbox)

**Data:** 2026-10-06  
**Prompt:** §23 PROMPT MESTRE F9-B  
**Refs:** [AUDITORIA_F9B…](./AUDITORIA_F9B_PRE_IMPL_2026-10-06.md) · [RELATORIO_FINAL…](./RELATORIO_FINAL_F9B_MP_CREATE_PAYMENT_2026-10-06.md) · [STOP…](./STOP_F9_MP_POS_AUDITORIA_2026-10-06.md)

---

## Entregas

- [x] auditoria F9-A / pré-impl
- [x] docs MP oficiais (Create Payment / Pix / Credentials)
- [x] Edge Function `create-mp-payment`
- [x] secret layout (`MP_ACCESS_TOKEN` / `MP_ENV=test` — valor só no Supabase; humano)
- [x] amount server-side (`orders.total`; body FE só `orderId`)
- [x] idempotency (`X-Idempotency-Key` = `fal-pay-{paymentId}`)
- [x] persistence (`provider`, `provider_payment_id`, `provider_status`, method server `pix`)
- [x] sem aprovação automática (MP `approved` → interno `pending` + `orderApproved: false`)
- [x] service FE fino (`createMercadoPagoPayment(orderId)`)
- [x] testes (core + flow A–I com fetch mock)
- [x] build PASS
- [x] regressão F7/F8 (`CheckoutPage` / `place_order` / inventory / transitions intactos)
- [x] security scan (§22)
- [x] commit
- [x] push
- [x] PR
- [x] merge (core PR #6 @ `06be4e4`; gap-close conform em PR subsequente)
- [x] STOP F9-B (não iniciar F9-C)

## Security scan (§22) — 2026-10-06

| Busca | Resultado |
|-------|-----------|
| `VITE_MP_ACCESS*` | **ausente** |
| `APP_USR-` / token hardcoded | **ausente** |
| `MP_ACCESS_TOKEN` | só `.env.example` (placeholder), README, `Deno.env.get`, mensagem de erro, testes mock |
| `console.log` de token | **ausente** |
| amount/method controlável pelo FE | **rejeitado** em `parseCreateMpPaymentClientBody` |
| Secrets no git | **nenhum** |

## Casos A–I (§20)

| Caso | Cobertura | Arquivo |
|------|-----------|---------|
| A order válido → MP com amount DB | PASS | `createMpPaymentFlow.test.ts` |
| B amount no body → rejeitado | PASS | idem |
| C pedido outro usuário → 404 | PASS | idem |
| D status ≠ aguardando_pagamento → 409 | PASS | idem |
| E token ausente → `MP_ACCESS_TOKEN missing` | PASS | idem |
| F MP erro → sem approved interno | PASS | idem |
| G MP approved → sem aprovar pedido | PASS | idem |
| H pending reutilizável | PASS | idem |
| I X-Idempotency-Key estável | PASS | idem |

## Fora de escopo (STOP)

Webhook · Pix/cartão UI · SDK React · CheckoutPage · produção · F7/`place_order` · migration nova · mock de sucesso MP no runtime.
