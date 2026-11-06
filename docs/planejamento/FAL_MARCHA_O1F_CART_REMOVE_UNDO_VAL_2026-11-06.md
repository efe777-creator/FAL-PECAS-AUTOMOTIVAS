# VAL — O1-F: Remover no carrinho com Desfazer

**Data:** 2026-11-06  
**Auth:** MARCHA + verificação plano mestre  
**Item:** Remover apagava o item sem desfazer (plano O1-F)

## Verificação prévia (plano × código)

Fechados: 404 loja, MobileNav lg, ScrollToTop pathname, card→PDP, confirmação pedido, preço unitário, lote admin, SearchBar/SEO.  
Abertos acionáveis restantes após esta fatia: CPF checkout leitura; PDP frete 0 opções; admin 404; dashboard zeros no loading.

## Entrega

| Peça | Mudança |
|------|---------|
| `Toast` | Ação com `onClick` (botão) além de `to` (Link) |
| `CartContext.restoreItem` | Recoloca snapshot do `CartItem` |
| `CartPage` | Remover → toast “Desfazer”; copy sem jargão “sincronizado” |

## Critérios

- [x] Remover mostra toast com Desfazer
- [x] Desfazer restaura qty/preço do item
- [x] CTA Link existente no toast continua funcionando (`to`)
- [x] `tsc -b` OK

## Gate humano

Nenhum nesta fatia.
