# MARCHA VAL — Painel Modular B (série + Recharts)

**Data:** 2026-11-17  
**Spec:** [2026-11-17-painel-modular-b-series-design.md](../superpowers/specs/2026-11-17-painel-modular-b-series-design.md)

## Entregue

| Item | Status |
|------|--------|
| Glossário GMV ≠ caixa fechado | PASS |
| RPC `admin_dashboard_daily_series` (remoto + migration git) | PASS |
| `recharts@3.3.0` + widgets série GMV/caixa | PASS |
| Seletor de período no shell | PASS |
| Auth F8/caixa nos charts | PASS |

## Testes

```bash
cd fal-pecas && npx vitest run src/lib/adminDashboardPeriod.test.ts src/lib/adminDashboardWidgets.test.ts src/lib/adminDashboardLayout.test.ts
```

## Smoke

1. Role F8: período 7d/30d → charts GMV e caixa  
2. Labels explícitos ≠ misturar eixos  
3. Operador: charts não no catálogo  
4. Personalizar → + Widget → adicionar série se removida  
5. Dark/light legível  

## Fora (C)

Tabela layout server · workspaces · PostHog.
