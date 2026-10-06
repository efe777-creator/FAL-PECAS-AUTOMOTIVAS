# Plano de inicialização — Fase 9

**Data:** 2026-10-06  
**Status:** INICIALIZAÇÃO (docs) — **F9-A ainda não implementada neste documento**  
**Deps:** F8.4 em `dev`; F8.5 Opção A em `dev` (migration apply pendente); Git `plan`/`dev`/`main`.

## Objetivo

Trocar adapters mock de **frete** e **pagamento** por integrações sandbox/reais, sem redesenhar checkout/F7/F8.

## Fatias

| Fatia | Conteúdo | Ordem |
|-------|----------|-------|
| F9-A | Frete Correios sandbox | **1ª** |
| F9-B | Frenet / agregador | 2 |
| F9-C | Gateway pagamento | 3 (após apply F8.5 recomendado) |
| F9-D | Observabilidade | 4 |
| F9-E | Testes live | 5 |

## Contratos a preservar

- `ShippingProvider.quote`
- `setShippingProvider` / `shippingService`
- Checkout: `quoteShipping`, `placeOrder`
- `place_order` / ciclo F7

## Env (sem valores)

- `VITE_SHIPPING_PROVIDER=correios|mock|frenet|carrier`
- Credenciais Correios sandbox (quando houver conta)

## Critérios F9-A

- [ ] Provider Correios retorna PAC/SEDEX (ou equivalente sandbox)
- [ ] Origem admin (`AdminShippingOriginPage`) usada
- [ ] Fallback seguro se credencial ausente
- [ ] Testes unitários do provider
- [ ] Sem alterar UX checkout

## Fora

WMS, ERP, reescrever F7/F8, guest checkout.
