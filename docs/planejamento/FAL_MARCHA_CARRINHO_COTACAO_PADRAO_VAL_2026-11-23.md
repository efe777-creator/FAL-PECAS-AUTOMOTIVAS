# VAL — Carrinho cotação no padrão FAL (cruzamento + UI)

**Branch:** `dev` · **Sem MAIN**  
**Data:** 2026-11-23  
**Aside alvo:** resumo carrinho (`CartPage` + `CartShippingQuoteBlock`)

## Cruzamento canônico

| Doc | Regra | Código |
|-----|-------|--------|
| SPEC cotação 13/11 **D1** | Frete **em conjunto** (nunca soma unitária) | `loadCartLogistics` + `quoteStorefrontShippingEnvelope` |
| O1-D auto-requote | CEP 8 dígitos → recota ao mudar `cartKey` | `useEffect([cartKey])` |
| O1-D storefront copy | Sem jargão D-FRETE/VITE_/mock na UI | filtro disclaimer |
| PDP M5 frete | Título **Calcular frete**; CEP + **Consultar** `variant="dark"`; endereço salvo em `<details>` | alinhado no carrinho |
| Store pickup | Retirada R$ 0 + notice compacto **Endereço da loja** | `StorePickupNotice compact` |
| Handoff | Opção/CEP → checkout | `saveShippingQuoteHandoff` |

## Gaps fechados nesta marcha

| Gap | Antes | Depois |
|-----|-------|--------|
| Título UI | “Entrega e frete” | “Calcular frete” (paridade PDP) |
| CEP/CTA | `Input` empilhado + “Consultar fretes” light | CEP inline + Consultar dark |
| Endereço salvo | Sempre aberto | `<details>` “Usar endereço salvo” |
| Nº frete próprio | Sempre visível + label jargão | Só se `hintNeedsNumber` ou já preenchido |
| Radios | Borda flat | Ring ativo (padrão PDP) |
| ETA | `· X–Y d` inline | `formatShippingEtaLabel` |

## Intactos (não mexer)

- Motor conjunto / packing ME / POL FAL (SPEC §2–5)  
- Linha **Frete** + **Total estimado** no aside (resumo, não duplica título)  
- Sticky CTAs / layout linhas (VAL layout limpo)

## Evidência

| Gate | Resultado |
|------|-----------|
| `compatUiAntiregress` (Cart frete UI) | PASS |
| `tsc --noEmit` | PASS |

## Arquivos

- `fal-pecas/src/components/cart/CartShippingQuoteBlock.tsx`
- `compatUiAntiregress.test.ts`
