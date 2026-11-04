# VAL — MARCHA Melhor Envio híbrido (D12)

**Data:** 2026-11-04  
**Tipo:** validação de implementação (código)  
**Premissa:** D-FRETE **B** · default loja permanece `mock` · etiqueta manual na Expedição  

---

## Entregue nesta marcha

| Fatia | Estado | Evidência |
|-------|--------|-----------|
| PR-1 Cart `loadCartLogistics` | **PASS** código | `CartShippingQuoteBlock.tsx` |
| PR-2 Carrier `melhorenvio` + Edge calculate | **PASS** código | `melhorEnvioEdgeProvider` · `quote-shipping` · registry |
| PR-2 `shipping_quotes` + `meq:` place_order | **PASS** migration local | `20261104192000_me_hybrid_shipping_quotes_place_order.sql` (RLS `profile_id`) |
| PR-3 Prepare-on-approve | **PASS** código | `mercado-pago-webhook` → `label_state: prepared` sem purchase |
| PR-4 Label HTTP + origem DB | **PASS** código | `melhorenvio-label` cart/checkout/generate/print + `store_shipping_origin` |
| Testes unitários | A correr | carrierRegistry · meShippingOptionId · label state |

## Ops pós-merge (MARCHA 04/11)

| Item | Estado | Evidência |
|------|--------|-----------|
| PR #57 merge | **PASS** | `461487f` → `main` |
| Migration wtbp | **PASS** | `shipping_quotes` + `melhorenvio_webhook_events` + `resolve_me_shipping_option` |
| Deploy Edges | **PASS** | `quote-shipping`, `melhorenvio-label`, `mercado-pago-webhook` @ wtbp |

## Ainda depende de eFe

| Item | Estado 04/11 soberana | Nota |
|------|----------------------|------|
| Secrets `USER_AGENT` / `WEBHOOK_SECRET` | **SET** | ver [M-ME-SEC VAL](./FAL_MARCHA_ME_SEC_VAL_2026-11-04.md) |
| Secret `MELHOR_ENVIO_TOKEN` | **PENDENTE** | Bearer sandbox — eFe após login |
| `VITE_SHIPPING_PROVIDER=melhorenvio` (opt-in) | HOLD | Netlify / local — **não** default produção sem decisão |
| M6 medidas SKUs | **100 quote-ready** | [VAL M6](./FAL_MARCHA_M6_MEDIDAS_VAL_2026-11-04.md) provisório global |
| Saldo carteira sandbox | — | Antes do 1º `purchase` real |
| Smoke E2E | BLOQUEADO | Após `MELHOR_ENVIO_TOKEN` |

## Aceite D12 (checklist)

- [x] Carrinho carrega logistics reais na cotação  
- [x] Path `meq:` no código + SQL  
- [x] Approve MP não compra etiqueta; prepare `prepared`  
- [x] Expedição pode cart→checkout→generate→print (HTTP sandbox)  
- [ ] Smoke E2E com secrets + migration aplicada (humano)  
- [ ] Disclaimer B visível com provider ME  

## Arquivos-chave

- `fal-pecas/src/components/cart/CartShippingQuoteBlock.tsx`
- `fal-pecas/src/services/shipping/providers/melhorEnvioEdgeProvider.ts`
- `fal-pecas/src/services/shipping/carrierRegistry.ts`
- `fal-pecas/supabase/functions/quote-shipping/index.ts`
- `fal-pecas/supabase/functions/mercado-pago-webhook/index.ts`
- `fal-pecas/supabase/functions/melhorenvio-label/index.ts`
- `fal-pecas/supabase/migrations/20261104192000_me_hybrid_shipping_quotes_place_order.sql`

## STOP

Código + migration + Edges **ok**. Secrets ME + M6 = humano ([soberana pós-α](./FAL_MARCHA_SOBERANA_POS_ALPHA_EXEC_2026-11-04.md)).

**Assinatura agente:** VAL ME híbrido 2026-11-04 · sync soberana 2026-11-04.
