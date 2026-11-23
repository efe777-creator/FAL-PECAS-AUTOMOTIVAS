# VAL — Carrinho layout limpo (P0 auditoria)

**Branch:** `dev` · **Sem MAIN**  
**Data:** 2026-11-23  
**Base:** [FAL_AUDITORIA_CARRINHO_LAYOUT_FUNCOES_VISUAL_2026-11-23.md](./FAL_AUDITORIA_CARRINHO_LAYOUT_FUNCOES_VISUAL_2026-11-23.md)

## Escopo

1. Linha item mobile: grid `72px + 1fr`; total empilhado (`sm:hidden`); coluna total só `sm+`.  
2. Sticky guest/Finalizar acima do MobileNav; CTAs do aside só `lg+`.  
3. Sem “Ver produto”; preço unitário/`à vista` só quando qty>1 ou desconto; Continuar comprando.  
4. Frete: notice compacto “Endereço da loja” (sem repetir “Retirada na loja”).

## Evidência

| Gate | Resultado |
|------|-----------|
| `compatUiAntiregress` (Cart layout P0) | PASS (22) |
| `tsc --noEmit` | PASS |
| Smoke localhost `/carrinho` mobile 390 | PASS — 1 preço/linha; sticky acima nav; notice “Endereço da loja” |
| Smoke desktop 1280 | PASS — sticky `display:none`; aside CTAs; grid 3 col |

## Arquivos

- `fal-pecas/src/pages/Cart/CartPage.tsx`
- `fal-pecas/src/components/cart/CartShippingQuoteBlock.tsx`
- `fal-pecas/src/components/shipping/StorePickupNotice.tsx`
- `compatUiAntiregress.test.ts`
