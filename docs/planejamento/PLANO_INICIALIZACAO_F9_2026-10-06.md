# Plano de inicialização — Fase 9

**Data:** 2026-10-06  
**Status:** F9-A/B/C **DONE** em `main` (`1abea37`); F9-D…E pendentes  
**Deps:** F8.4 + F8.5 + vitrine + F9-A/B/C em `main`.

## Objetivo

Trocar adapters mock de **frete** e **pagamento** por integrações sandbox/reais, sem redesenhar checkout/F7/F8.

## Fatias

| Fatia | Conteúdo | Ordem | Status |
|-------|----------|-------|--------|
| F9-A | Frete Correios sandbox | 1 | **DONE** |
| F9-B | Frenet / agregador sandbox | 2 | **DONE** |
| F9-C | Gateway pagamento sandbox | 3 | **DONE** (`feb1678` → PR #4) |
| F9-D | Observabilidade | 4 | pendente |
| F9-E | Testes live | 5 | pendente |

## Env (sem valores)

- `VITE_SHIPPING_PROVIDER=correios|mock|frenet|carrier`
- `VITE_PAYMENT_PROVIDER=simulated|gateway|sandbox`
- Credenciais reais → Edge Function (nunca no frontend)

## Critérios F9-C

- [x] Adapter gateway sandbox no contrato `PaymentProvider`
- [x] Ciclo F7 via `confirm_simulated_payment` (DB provider=`simulated`)
- [x] `VITE_PAYMENT_PROVIDER=gateway|sandbox`
- [x] Checkout UX inalterada
- [x] Testes unitários (resolve + enrich metadata)

## Fora

HTTP gateway real, webhooks, WMS/ERP, reescrever checkout.

## Próximo

**F9-D** (observabilidade) — MARCHA. Depois F9-E / F8.6+.
