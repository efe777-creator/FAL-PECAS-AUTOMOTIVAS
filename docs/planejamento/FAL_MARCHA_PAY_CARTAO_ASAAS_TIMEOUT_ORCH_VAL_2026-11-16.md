# MARCHA — FAL PAY cartão Asaas (timeout + orquestrador + reconcile + webhook)

**Data:** 2026-11-16  
**Gate:** eFe autorizou `marcha` após auditoria `FAL_PAY_ARQUITETURA_HIBRIDA_ASAAS_MERCADO_PAGO.md`  
**Ambiente código:** working tree local (baseline `main@4e7fab1` + mudanças desta marcha)  
**Deploy Edges:** **DONE** (2ª autorização `marcha` no mesmo dia) — Netlify front **não** redeployado.

## Objetivo

Destravar create de cartão (fatura Asaas) que caía em **546 WORKER_RESOURCE_LIMIT / WallClockTime** por Edge→Edge + fetch Asaas sem timeout.

## Etapas executadas (plano §15: 2→3→4→5 + testes)

| # | Etapa | Status |
|---|--------|--------|
| 2 | Timeout + AbortSignal no cliente Asaas; falha tipada `inconclusive` | **DONE** |
| 3 | Orquestrador in-process: `create-fal-payment` → Asaas sem `fetch` Edge | **DONE** |
| 4 | Fase `charge_phase` + lock + reconcile `GET /payments?externalReference=` | **DONE** |
| 5 | Webhook: token obrigatório, re-fetch, amount, sanitize payload | **DONE** |
| — | Vitest pay (incl. reconcile/timeout tipagem) | **PASS** 89/89 |
| 0 / 6+ | Align Netlify + smoke cartão homologado | **PENDENTE** (deploy + humano) |

## Arquivos

| Área | Path |
|------|------|
| HTTP Asaas | `fal-pecas/supabase/functions/_shared/asaasApiCore.ts` |
| Reconcile / fases | `fal-pecas/supabase/functions/_shared/asaasReconcileCore.ts` |
| Fluxo create | `fal-pecas/supabase/functions/_shared/asaasCreateChargeFlow.ts` |
| Edge gateway | `fal-pecas/supabase/functions/create-fal-payment/index.ts` |
| Edge Asaas | `fal-pecas/supabase/functions/create-asaas-payment/index.ts` |
| Webhook | `fal-pecas/supabase/functions/asaas-webhook/index.ts` |
| UX erros | `createFalPaymentService.ts`, `createAsaasPaymentService.ts` |
| Testes | `asaasReconcileCore.test.ts` (+ suíte payments) |

## Comportamento crítico

1. `asaasApiRequest` aborta em **20s**; timeout → `inconclusive: true` (não rejeita cego).
2. Antes de `POST /payments`: lista por `externalReference` (= `orderId`) e reusa se valor/billing bater.
3. Pós-timeout: marca `metadata.charge_phase = inconclusive`, reconcilia; se achar, anexa `provider_payment_id` + `invoiceUrl`.
4. Lock `creating` (~45s) evita POST concorrente.
5. `create-fal-payment` Asaas = in-process; MP Pix continua forward `create-mp-payment`.
6. Webhook **exige** `ASAAS_WEBHOOK_TOKEN`; confirma só após GET remoto + match de valor.

## Evidência testes

```
vitest run src/services/payments → 13 files, 89 tests passed
```

## Deploy prod (2ª marcha do dia)

| Item | Resultado |
|------|-----------|
| Secret `ASAAS_WEBHOOK_TOKEN` | **PASS** — presente (updated 2026-11-15) |
| `create-fal-payment` | **PASS** — ACTIVE **v3** (assets: charge flow + reconcile + api timeout) |
| `create-asaas-payment` | **PASS** — ACTIVE **v32** |
| `asaas-webhook` | **PASS** — ACTIVE **v6** · `verify_jwt=false` |
| Probe create sem JWT | **401** `UNAUTHORIZED_NO_AUTH_HEADER` |
| Probe webhook sem/token inválido | **401** `invalid_webhook_token` (token obrigatório live) |
| OPTIONS create-fal | **200** |

Comando: `npx supabase functions deploy … --project-ref wtbpwuiayednvlhvuhbh --use-api --yes` (+ `--no-verify-jwt` no webhook).

## Validação real (3ª marcha do dia — “validar e testar”)

Script: `fal-pecas/scripts/smoke-asaas-card-create.mjs`

| Caso | Resultado |
|------|-----------|
| Bundle Netlify **legado** (`fal-pecas-automotivas` / efe pré-deploy) | **FALHA** — só `MercadoPagoCard`; sem `create-fal-payment` |
| Create autenticado `debit_card` pedido `b0304f49…` R$31,97 | **PASS** — HTTP **201** · **6429 ms** · `pay_dtat5u94wuay5m11` · `charge_phase=gateway` |
| Reuso mesmo pedido | **PASS** — HTTP **200** · `reused:true` · ~3755 ms |
| Fatura `https://www.asaas.com/i/dtat5u94wuay5m11` | **PASS** — HEAD **200** (conta Asaas **produção**) |
| Create `credit_card` R$1,00 | **BLOQUEIO Asaas** — mínimo R$5 (`invalid_value`) — esperado |
| Netlify **efe** deploy | **PASS** — live `6afb20dc…` · engine chunk com `create-fal-payment` |
| Netlify site principal `fal-pecas-automotivas` | **FALHA deploy** — `JSONHTTPError: Not Found` (usar efe) |

Pedido permanece `aguardando_pagamento` até pagamento humano da fatura + webhook (esperado).

## Próximos passos

1. Smoke humano: abrir fatura Asaas do pedido `b0304f49…`, pagar → confirmar `em_analise` via webhook.
2. Usar **https://fal-pecas-automotivas-efe.netlify.app** (principal ainda órfão/antigo).
3. Regressão PIX MP T1–T2.

## Aceite

| Critério | Resultado |
|----------|-----------|
| Timeout tipado no cliente Asaas | PASS |
| Sem Edge→Edge no hot path Asaas | PASS |
| Reconcile antes/após timeout | PASS |
| Webhook endurecido | PASS (código + probe 401 token) |
| Suíte payments verde | PASS 89/89 |
| Deploy Edges prod | PASS v3 / v32 / v6 |
| Smoke create cartão autenticado | **PASS** (debit R$31,97 + reuse) |
| Front com `create-fal-payment` | **PASS** em efe; principal **não** alinhado |
| Pagamento fatura → pedido aprovado | PENDENTE (humano) |

**Assinatura:** MARCHA PAY cartão Asaas — validado create real + front efe 2026-11-16.
