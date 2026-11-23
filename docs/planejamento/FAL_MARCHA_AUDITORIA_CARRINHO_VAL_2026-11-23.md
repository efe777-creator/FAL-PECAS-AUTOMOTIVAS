# VAL — Auditoria carrinho (layout · funções · visual)

**Branch:** `dev` · **Sem MAIN** · **Sem código**  
**Data:** 2026-11-23  
**Doc:** [FAL_AUDITORIA_CARRINHO_LAYOUT_FUNCOES_VISUAL_2026-11-23.md](./FAL_AUDITORIA_CARRINHO_LAYOUT_FUNCOES_VISUAL_2026-11-23.md)

## Escopo

Inventário as-is + cruzamento O1-G/O1-F/E.3–E.4/cotação + matriz gap + smoke read-only.  
**Fora:** qualquer patch em `CartPage` / Context / frete · deploy.

## Gates

| Gate | Resultado |
|------|-----------|
| Inventário código (CartPage, Context, frete, M32, buy_now paralelo) | **PASS** |
| Cruzamento docs canônicos (plano mestre, compat, SPEC cotação, mapa, UX, REF) | **PASS** |
| Matriz gap Funções/Layout/Visual/Copy/Compat | **PASS** (doc) |
| Smoke localhost `/carrinho` (2 itens, guest, ~323px) | **PASS** evidência |

## Achados P0 (só recomendação)

1. **Overlap** preço × título na linha mobile (`grid-cols-[86px_1fr_auto]`).  
2. **Sem sticky** Finalizar / CTAs guest no mobile (E.3).

## Próximo

Aprovação eFe → marcha implementação P0 (layout mobile + sticky).
