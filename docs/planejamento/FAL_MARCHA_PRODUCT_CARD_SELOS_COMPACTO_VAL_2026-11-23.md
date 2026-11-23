# VAL — ProductCard compacto + selos Kit/Promo

**Data:** 2026-11-23 · **Branch:** `dev` · Sem MAIN sem OK  
**Auth:** eFe — MARCHA card denser + selos harmônicos

## Escopo

Compactar levemente o card (só densidade) e redesenhar selos Kit/Promo — **sem** remover infos, CTAs Notes #7 ou dinâmica PVC/apps (M15).

## Entrega

| Item | Status |
|------|--------|
| `Badge` `variant`: `promo` (amarelo) · `kit` (navy) · `default` | PASS |
| Selos na mídia em **row** (`top-2 left-2`) | PASS |
| Densidade: `sm:p-3`, título sem `min-h`, gaps −2–4px | PASS |
| PVC após título; CTAs wrappers intactos | PASS |
| `compatUiAntiregress` M15 atualizado | PASS |

## Aceite

- [x] Card um pouco mais baixo sem perder texto/funções  
- [x] Kit e Promo distintos (navy vs amarelo) e juntos em linha  
- [x] Dinâmica PVC / apps / CTAs igual  
