# MARCHA — Estrutura frete / carriers + MCP Correios + UI sandbox

**Data:** 2026-10-10  
**Estado:** VALIDADO (unit) / IMPLEMENTADO (UI sandbox) — **live HTTP fora**  
**Plano:** [FAL_PLANO_FRETE_FINALIZACAO_2026-10-10.md](./FAL_PLANO_FRETE_FINALIZACAO_2026-10-10.md)  
**Auditoria:** [FAL_AUDITORIA_FRETE_COTACAO_ENTREGA_2026-10-10.md](./FAL_AUDITORIA_FRETE_COTACAO_ENTREGA_2026-10-10.md)  
**PRs:** #29 · #30 · #31

---

## Escopo feito

| Item | Evidência |
|------|-----------|
| Registry plugável | `carrierRegistry.ts` — mock / correios / frenet / carrier(disabled) |
| Contrato envelope | `shippingQuoteContract.ts` + `quoteShippingEnvelope.ts` |
| Edge esqueleto | `supabase/functions/quote-shipping` (501 até HTTP) |
| Cliente edge | `edgeQuoteClient.ts` |
| MCP Correios | `.cursor/mcp.json` + [setup](./FAL_CORREIOS_MCP_SETUP_2026-10-10.md) |
| Unit | suite `src/services/shipping` — **17** tests |
| PDP Entrega e frete | `ProductShippingQuoteBlock` |
| Carrinho conjunto | `CartShippingQuoteBlock` + invalidação |
| Checkout envelope | `quoteShippingEnvelope` + guard `placeOrderReady` |
| Handoff CEP | `shippingQuoteSession` |
| Logística storefront | `productService` weight/dims + `loadCartLogistics` |
| Plano + relatório sync | verificação 10/10 docs |

## Fora / próxima auth

- HTTP real Correios na edge  
- `place_order` além de `mock:*`  
- Deploy secrets / MCP credentials eFe  
- Smoke staff UI + VAL frete E2E  

## Critérios de pronto (desta marcha)

- [x] Carriers listáveis com `placeOrderReady` correto (só mock)  
- [x] Envelope com disclaimer sandbox/mock  
- [x] Edge recusa sem secrets / sem peso (esqueleto)  
- [x] MCP configurado (credenciais humanas)  
- [x] Auditoria A–J atualizada  
- [x] Plano completo de finalização frete  
- [x] PDP + carrinho + checkout sandbox  
