# VAL — Painel layout visual (mock FAL + Adminex)

Data: 2026-11-17  
Escopo: polish de apresentação do Painel — header, KPIs, fluxo, atenção+logística, default layout.

## Critérios de aceite

| Critério | Resultado |
|----------|-----------|
| Header: título + "Centro de comando operacional"; período compacto; Personalizar forte | PASS |
| Glossário longo removido do header | PASS |
| KPI row `exec-summary`: 4 cards densos (ativos · atenção · GMV · caixa role-gated); sem %/sparkline | PASS |
| Fluxo horizontal 5 grupos + faixa Exceções + painel de detalhe | PASS |
| Atenção (Pedido · Situação · Próxima ação) + Logística 2×2; proporção ~8/4 | PASS |
| `chart-performance` dual GMV+caixa full width; período só no header | PASS |
| Default/Reset → coords `DEFAULT_LAYOUT_PLACEMENTS`; layout salvo permanece | PASS |
| Sem métricas inventadas (% vs período, atraso, SLA) | PASS |
| Sidebar admin fora do escopo | PASS |

## Smoke visual (manual)

1. **Light**: `/admin` após Reset — primeira dobra = KPIs + fluxo; atenção|logística; desempenho abaixo.
2. **Dark**: tokens `fal-*` legíveis (bordas, muted, accent no estágio selecionado).
3. **Personalizei → F5**: layout custom persiste; Reset volta ao default novo.
4. **Operador**: vê exec-summary (ativos/atenção) + fluxo + atenção + logística; sem chart-performance/GMV/caixa.
5. **Admin/gerente**: 4 KPIs + chart dual.

## Arquivos

- `AdminDashboardPage.tsx` — header
- `DashboardWidgets.tsx` — exec-summary, pipeline, atenção, logística, chart-performance
- `adminDashboardWidgets.ts` — catálogo + `DEFAULT_LAYOUT_*`
- `adminDashboardLayout.ts` — placements no `buildDefaultLayout`
- `DashboardLayoutEngine.tsx` — densidade/chrome

## Notas

- Contagens de atenção no resumo usam a amostra atual (team+customer); sem inventar SLA.
- Widgets legados (`kpi-*`, charts soltos) seguem no catálogo para + Widget.
