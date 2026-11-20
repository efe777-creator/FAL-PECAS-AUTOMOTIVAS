# VAL — Anti-regressão compat (estável)

**Data:** 2026-11-20 · **Branch:** `dev`  
**Objetivo:** travas Vitest sem browser/flaky que protegem E.1 aviso, E.7 sheet e dedup UI.

## Comando

```bash
cd fal-pecas && npm run test:compat-antiregress
```

## Contratos

| Trava | O que falha se regredir |
|-------|-------------------------|
| PDP um summary | Status incompat duplicado em `#pdp-detalhes` |
| Modal sheet | Perde `items-end` / `rounded-t` / `footer` |
| ModalActions | Confirm/M32 voltam a CTAs duplicados |
| Card showSeal | Hide com label some de novo |
| Badge hide | Estilo danger / null cego |
| Motor | `no_intersection` sem label `Incompatível` |

**Assinatura:** MARCHA anti-regress compat · 2026-11-20
