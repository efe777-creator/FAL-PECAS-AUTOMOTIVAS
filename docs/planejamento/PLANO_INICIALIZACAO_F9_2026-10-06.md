# Plano de inicialização — Fase 9

**Data:** 2026-10-06  
**Status:** F9-A + **F9-B DONE** em `main` (`ede8acf`); F9-C…E ainda não iniciadas  
**Deps:** F8.4 + F8.5 + vitrine + F9-A/B em `main`.

## Objetivo

Trocar adapters mock de **frete** e **pagamento** por integrações sandbox/reais, sem redesenhar checkout/F7/F8.

## Fatias

| Fatia | Conteúdo | Ordem | Status |
|-------|----------|-------|--------|
| F9-A | Frete Correios sandbox | **1ª** | **DONE** |
| F9-B | Frenet / agregador sandbox | 2 | **DONE** (`be677a2` → `dev` → `main`) |
| F9-C | Gateway pagamento | 3 | pendente |
| F9-D | Observabilidade | 4 | pendente |
| F9-E | Testes live | 5 | pendente |

## Contratos a preservar

- `ShippingProvider.quote`
- `setShippingProvider` / `shippingService`
- Checkout: `quoteShipping`, `placeOrder`
- `place_order` / ciclo F7

## Env (sem valores)

- `VITE_SHIPPING_PROVIDER=correios|mock|frenet|carrier`
- Credenciais Correios/Frenet reais → Edge Function (nunca no frontend)

## Critérios F9-A

- [x] Provider Correios retorna PAC/SEDEX (sandbox)
- [x] Fallback seguro sem credencial
- [x] Testes unitários
- [x] Sem alterar UX checkout

## Critérios F9-B

- [x] Provider Frenet retorna multi-transportadora (Jadlog / Correios PAC / Total Express)
- [x] `VITE_SHIPPING_PROVIDER=frenet`
- [x] Sandbox determinístico sem HTTP / sem token no frontend
- [x] Testes unitários (`frenetSandboxProvider.test.ts` — 2 PASS)
- [x] Sem alterar UX checkout

## Validação 2026-10-06

- Shipping tests: **4 PASS** (correios + frenet)
- Build PASS
- PR #3 MERGED → `main` @ `ede8acf`

## Fora

WMS, ERP, reescrever F7/F8, guest checkout, HTTP Frenet real.

## Próximo

**F9-C** (gateway pagamento) — só com MARCHA/auth. Não iniciar F9-D…E até F9-C.
