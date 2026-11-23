# VAL — Kit nas infos + Promo só “-N%” na foto

**Data:** 2026-11-23 · **Branch:** `dev` · Sem MAIN sem OK  
**Auth:** eFe — menos poluição na mídia do ProductCard

## Escopo

- Kit sai do overlay da foto → área de infos (acima do título).
- Promo na mídia: só chip compacto `-N%` (`formatDiscountPercentLabel`).
- Sem reabrir densidade/CTAs/PVC/M15.

## Entrega

| Item | Status |
|------|--------|
| Overlay mídia: só `-N%` se oferta + % exibível | PASS |
| Sem “Promoção · …” no card | PASS |
| Kit `variant="kit"` acima do `h3` | PASS |
| `compatUiAntiregress` M15 atualizado (23/23) | PASS |

## Aceite

- [x] Foto limpa: no máximo um chip `-N%`
- [x] Kit só nas infos, navy
- [x] Dinâmica PVC / apps / CTAs igual
