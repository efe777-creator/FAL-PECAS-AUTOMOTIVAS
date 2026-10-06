# STOP — pós F9-E (antes F9-F)

**Data:** 2026-10-06  
**Status:** **F9-E DONE** (webhook concurrency / hardening)  
**Baseline:** branch `feat/f9-e-webhook-hardening`

## Feito

- `decideWebhookTransition` — approved prevalece; fora de ordem = no-op / set_terminal / approve
- `sanitizeWebhookPayload` — ledger sem token/cvv/PAN
- `isWebhookTsFresh` — rejeita `signature_ts_stale` (>10 min)
- Edge `mercado-pago-webhook`: claim idempotente por `(provider, provider_event_id)`, race insert, re-read status antes de approve, fallback por `external_reference`
- Core sync em `supabase/functions/_shared/mpWebhookCore.ts`
- 13 testes vitest verdes + build OK

## Proibido até MARCHA F9-F

- Polimento checkout / UX pós-pago avançada
- Admin financeiro MP
- Produção MP (credenciais live)
- Commit de secrets no git

## Humano (bloqueia smoke live)

1. Colar **secret completo** do webhook MP no painel → `supabase secrets set MP_WEBHOOK_SECRET=... --project-ref wtbpwuiayednvlhvuhbh`
2. Redeploy: `supabase functions deploy mercado-pago-webhook --project-ref wtbpwuiayednvlhvuhbh`
3. Smoke Pix/cartão sandbox (assinatura + approve)

## Próximo

`MARCHA F9-F` — checkout polish / pós-pago (ou F9-G admin / F9-H homolog conforme prioridade).
