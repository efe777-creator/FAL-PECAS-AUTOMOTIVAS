# Relatório final F9-E — Webhook concurrency / hardening

**Data:** 2026-10-06  
**Branch:** `feat/f9-e-webhook-hardening`  
**Escopo:** harden `mercado-pago-webhook` + núcleo puro testável

## Entregue

| Peça | Onde |
|------|------|
| Transition policy | `fal-pecas/src/services/payments/mpWebhookCore.ts` → `decideWebhookTransition` |
| Sanitize ledger | `sanitizeWebhookPayload` |
| Replay window | `isWebhookTsFresh` → `signature_ts_stale` |
| Edge | `supabase/functions/mercado-pago-webhook/index.ts` |
| Shared Deno | `supabase/functions/_shared/mpWebhookCore.ts` (cópia) |
| Testes | `mpWebhookCore.test.ts` — 13 passed |

## Comportamento

1. Verifica `x-signature` + `x-request-id` + ts fresco.
2. Claim evento em `payment_events` (unique provider+event); duplicate processed → 200 reused.
3. GET payment MP; casar amount com `orders.total`.
4. Fallback: payment pending por `external_reference` se `provider_payment_id` ainda null.
5. Re-lê `payments.status`; aplica transition (noop / set_terminal / approve RPC).
6. Payload persistido sempre sanitizado.

## Fora / humano

- `MP_WEBHOOK_SECRET` completo ainda não setado no projeto → smoke live bloqueado.
- Sem alteração F7 / checkout UI nesta fase.

## Gates

- `npm test -- --run src/services/payments/mpWebhookCore.test.ts` ✅
- `npm run build` ✅
- STOP → F9-F

## Próximo

`MARCHA F9-F` após merge + (opcional) secret humano + redeploy webhook.
