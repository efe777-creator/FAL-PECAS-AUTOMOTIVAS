# VAL consolidado — Frente compatibilidade E.1–E.6

**Data:** 2026-11-19 · **Branch:** `dev`  
**Canônico:** `FAL_PLANO_BUSCA_EQUIVALENCIA_COMPATIBILIDADE_2026.md`

## Marchas desta frente

| # | Entrega | VAL |
|---|---------|-----|
| 0 | Card apps XOR selo (regressão TDI) | (fix ProductCard `showApps`) |
| 1 | Avisos card/PDP/carrinho/checkout | `FAL_MARCHA_COMPAT_AVISOS_CARD_PDP_CHECKOUT_VAL_2026-11-19.md` |
| 2 | Gate E.4 + form PDP + log lite | `FAL_MARCHA_COMPAT_GATE_E4_PDP_FORM_VAL_2026-11-19.md` |
| 3 | Trocar peça M32 | `FAL_MARCHA_COMPAT_M32_TROCAR_PECA_VAL_2026-11-19.md` |
| 4 | Pedido mostra fit + Completar dados | `FAL_MARCHA_COMPAT_E5_PEDIDO_GATE_COMPLETAR_VAL_2026-11-19.md` |
| 5 | Equivalentes E.6 admin+PDP | `FAL_MARCHA_COMPAT_E6_EQUIVALENTES_VAL_2026-11-19.md` |
| 6 | M32 prioriza E.6 + admin fit no pedido | este doc |
| 7 | E.2 aviso no buy-box + selo Incompatível no card | `FAL_MARCHA_COMPAT_E2_AVISO_BUYBOX_VAL_2026-11-20.md` |
| 8 | E.7 Gate/M32 bottom sheet mobile | `FAL_MARCHA_COMPAT_E7_SHEETS_VAL_2026-11-20.md` |
| 9 | Dedup UI (summary + ModalActions) | `FAL_MARCHA_COMPAT_DEDUP_UI_VAL_2026-11-20.md` |

## Aceite consolidado

| Superfície | Critério | Status |
|------------|----------|--------|
| Card | Selo E.1 / apps sem selo; Incompatível visível com fit | PASS |
| PDP | Aviso único no buy-box; form/apps em detalhes; equivalentes | PASS |
| Carrinho | Fit por item + Trocar + gate (sheet mobile E.7) | PASS |
| Checkout | Alerta M7 + log no snapshot | PASS |
| Pedido conta/admin | compatDecision imutável | PASS |
| Admin produto | Equivalentes ≠ Relacionados | PASS |
| M32 | Equivalentes técnicos primeiro | PASS |

## Fora / próximo

- Figma / polish visual E.8  
- Métricas/RMA Fase 7 full (ops dashboard)  
- Transitividade de equivalência (proibido — manter)

## Comandos

```bash
npx vitest run src/services/compatibility/ src/services/admin/adminProductEquivalenceService.test.ts
```

**Assinatura:** MARCHA consolidada compat E.1–E.6 · 2026-11-19
