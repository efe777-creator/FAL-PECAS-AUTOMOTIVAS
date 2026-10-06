# Plano de inicialização — Fase 9

**Data:** 2026-10-06  
**Status:** F9-A **ENTREGUE** em `main` (`762c697`); F9-B…E ainda não iniciadas  
**Deps:** F8.4 + F8.5 Opção A + P1 em `main`; migration F8.5 aplicada + registrada; Git `plan`/`dev`/`main` alinhados no pacote crítico.

## Objetivo

Trocar adapters mock de **frete** e **pagamento** por integrações sandbox/reais, sem redesenhar checkout/F7/F8.

## Fatias

| Fatia | Conteúdo | Ordem | Status |
|-------|----------|-------|--------|
| F9-A | Frete Correios sandbox | **1ª** | **DONE** (`454ce50` → `dev` → `main`) |
| F9-B | Frenet / agregador | 2 | pendente |
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
- Credenciais Correios sandbox (quando houver conta)

## Critérios F9-A

- [x] Provider Correios retorna PAC/SEDEX (ou equivalente sandbox)
- [x] Origem admin (`AdminShippingOriginPage`) usada (contrato F6C preservado)
- [x] Fallback seguro se credencial ausente (sandbox determinístico; sem HTTP)
- [x] Testes unitários do provider (`correiosSandboxProvider.test.ts` — 2 PASS)
- [x] Sem alterar UX checkout

## Validação 2026-10-06

- Código em `origin/main`: `shippingService` resolve via `VITE_SHIPPING_PROVIDER`
- `correiosSandboxProvider` em `correiosStubProvider.ts` — PAC/SEDEX
- Vitest shipping+pricing: **9 PASS**

## Fora

WMS, ERP, reescrever F7/F8, guest checkout.

## Próximo

Abrir **F9-B** só com auth explícita. Não iniciar F9-C…E até F9-B (ou decisão de pular agregador).
