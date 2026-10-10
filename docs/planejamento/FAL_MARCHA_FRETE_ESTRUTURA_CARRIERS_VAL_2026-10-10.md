# MARCHA — Estrutura frete / carriers + MCP Correios

**Data:** 2026-10-10  
**Estado:** IMPLEMENTADO (unit) — live HTTP e UI PDP **fora**  
**Auditoria:** [FAL_AUDITORIA_FRETE_COTACAO_ENTREGA_2026-10-10.md](./FAL_AUDITORIA_FRETE_COTACAO_ENTREGA_2026-10-10.md)

---

## Escopo feito

| Item | Evidência |
|------|-----------|
| Registry plugável | `carrierRegistry.ts` — mock / correios / frenet / carrier(disabled) |
| Contrato envelope | `shippingQuoteContract.ts` + `quoteShippingEnvelope.ts` |
| Edge esqueleto | `supabase/functions/quote-shipping` (501 até HTTP) |
| Cliente edge | `edgeQuoteClient.ts` |
| MCP Correios | `.cursor/mcp.json` + [setup](./FAL_CORREIOS_MCP_SETUP_2026-10-10.md) |
| Unit | `carrierRegistry.test.ts` (15 tests shipping suite) |
| PDP Entrega e frete | `ProductShippingQuoteBlock` + disclaimer envelope |
| Carrinho conjunto | `CartShippingQuoteBlock` — invalida se itens/qty mudam |

## Fora / próxima auth

- HTTP real Correios na edge  
- `place_order` além de `mock:*`  
- Cotação consolidada no carrinho  
- Deploy secrets produção / MCP credentials eFe  

## Critérios de pronto (desta marcha)

- [x] Carriers listáveis com `placeOrderReady` correto (só mock)  
- [x] Envelope com disclaimer sandbox/mock  
- [x] Edge recusa sem secrets / sem peso  
- [x] MCP configurado (credenciais humanas)  
- [x] Auditoria A–J registrada  
- [x] PDP com consulta CEP (sandbox/mock honesto)  
