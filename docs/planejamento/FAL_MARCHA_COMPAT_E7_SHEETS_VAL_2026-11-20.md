# VAL — Marcha E.7: Gate/M32 bottom sheet mobile

**Data:** 2026-11-20 · **Branch:** `dev`  
**Canônico:** E.7 · E.4 mobile (sheet + CTAs empilhados, primário embaixo)

## Entrega

| Item | Status |
|------|--------|
| `Modal` sheet `<md` (`items-end`, `rounded-t-2xl`, `max-h-[92dvh]`, safe-area) | PASS |
| `Modal` centro `md+` | PASS (browser 1265px, dialog centrado) |
| `footer` no Modal (CTAs fora do scroll) | PASS |
| `ConfirmDialog` CTAs empilhados fullWidth; primário embaixo | PASS |
| `ReplaceCartItemModal` lista no body + footer sticky | PASS |
| Catálogo drawer / PDP buy-box | já OK (fora desta marcha) |

## Smoke browser

| Cenário | Resultado |
|---------|-----------|
| Mobile 390×844 · Finalizar com PVI1038 + HB20 | Sheet ancorado em `bottom=844`; `rounded-t`; título gate incompat |
| CTAs gate | Empilhados ~350px; primário embaixo |
| Trocar peça M32 | Sheet `Substituir PIVO`; footer Cancelar / Substituir; primário embaixo |
| Desktop 1265×906 · mesmo gate | Modal central (`centeredApprox`) |

## Fora

- E.8 Figma  
- Form PDP em sheet dedicado  
- Componente `BottomSheet` paralelo

**Assinatura:** MARCHA E.7 sheets gate/M32 · 2026-11-20
