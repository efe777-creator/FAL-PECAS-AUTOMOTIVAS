# MARCHA — Validação cartão débito/crédito (Asaas)

**Data:** 2026-11-16  
**Auth:** eFe (`MARCHA`)  
**Projeto:** `wtbpwuiayednvlhvuhbh`  
**Pedido smoke:** `b0304f49-b32e-4189-8c0b-e0906ee14573` (R$ 31,97)

## Escopo

Validar create fatura (débito/crédito), crédito embutido (`pay-asaas-credit-card`), webhook e ledger — sem cartão real.

## Ambiente

| Item | Achado |
|------|--------|
| Secrets `ASAAS_*` | Presentes |
| Host fatura | `www.asaas.com` → **produção** (não sandbox) |
| Cartões oficiais Asaas | Só sandbox → aprovação E2E **bloqueada** neste ambiente |

## Resultados

| # | Caso | Status | Evidência |
|---|------|--------|-----------|
| U1 | Vitest payments | **PASS** | 99/99 |
| C1 | Create/reuse `debit_card` | **PASS** | HTTP 200 · `pay_dtat5u94wuay5m11` · phase `gateway` |
| C2 | Create/reuse `credit_card` (invoiceUrl) | **PASS** | após fix unique · ledger com URL |
| C3 | Fatura HEAD | **PASS** | `https://www.asaas.com/i/dtat5u94wuay5m11` → 200 |
| E1 | `pay-asaas-credit-card` schema | **PASS** | HTTP 400 `creditCard_obrigatorio` |
| E2 | Crédito embutido cartão recusa (MC sandbox em prod) | **PASS** | HTTP 502 `asaas_card_declined_or_invalid` · pedido permanece `aguardando_pagamento` |
| E3 | Aprovação cartão teste | **BLOQUEADO** | precisa `ASAAS_ENV=sandbox` |
| W1 | Webhook sem token | **PASS** | HTTP 401 `invalid_webhook_token` |
| W2 | Pagamento humano → pedido pago | **PENDENTE** | fatura aberta; sync/webhook após pagar |

## Bugs encontrados e corrigidos nesta marcha

### 1) Troca débito↔crédito deixava ledger `stub` sem URL

**Causa:** cancel por `method_switch` mantinha `provider_payment_id` na linha cancelled → UNIQUE `(provider, provider_payment_id)` impedia attach no pending novo; resposta da Edge mentia sucesso.

**Fix:** ao cancelar, zera `provider_payment_id`/`payment_url` e guarda em `metadata.previous_*`; `attachRemotePayment` falha tipada se update falhar.

**Deploy:** `create-fal-payment` v4+, `create-asaas-payment` v33+.

### 2) Edge `pay-asaas-credit-card` não estava deployada

**Efeito:** HTTP 404 no crédito embutido.

**Fix:** deploy da função + ajuste: falha em `payWithCreditCard` mantém phase `gateway` e devolve erro tipado (`asaas_card_declined_or_invalid`).

## Scripts

- `fal-pecas/scripts/smoke-asaas-card-create.mjs` — fatura create/reuse  
- `fal-pecas/scripts/smoke-asaas-credit-embedded.mjs` — schema \| approve \| decline  

## Pendências (próxima marcha)

1. Homologar aprovação embutida com **sandbox** Asaas (`ASAAS_ENV=sandbox` + chave sandbox).  
2. Pagar fatura de teste (humano) e validar webhook/`sync-asaas-payment` → pedido `em_analise`/pago.  
3. Alinhar Netlify site principal se ainda no bundle legado.
