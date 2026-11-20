# VAL — Marcha 7 lite: métricas compat (Fase 7)

**Data:** 2026-11-19 · **Branch:** `dev`  
**Canônico:** Fase 7 — Incompat separada; VIN ok (LGPD já via `maskPlate`)

## Aceite

| Critério | Status |
|----------|--------|
| Eventos analytics com `incompat_count` separado de `unconfirmed_count` | PASS |
| Gate shown / continue / complete_vehicle / replace | PASS |
| Troca M32 → `compat_item_replaced` (+ `from_equivalence`) | PASS |
| Pedido com log → `compat_order_fit_log` | PASS |
| VIN/placa: máscara LGPD existente (`maskPlate`) | PASS (prévio) |
| Dashboard ops / RMA dedicado | FORA (próximo ciclo ops) |

## Eventos

- `compat_gate_shown`
- `compat_gate_continue`
- `compat_gate_complete_vehicle`
- `compat_gate_replace`
- `compat_item_replaced`
- `compat_order_fit_log`

## Comandos

```bash
npx vitest run src/lib/analytics.test.ts src/services/compatibility/
```

**Assinatura:** MARCHA 7 lite métricas compat · 2026-11-19
