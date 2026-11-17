# Design — Painel Modular Marcha B (série + Recharts)

**Data:** 2026-11-17 · **Status:** implementação  
**Predecessor:** [painel-modular-avancado-design](./2026-11-17-painel-modular-avancado-design.md)

## Escopo B

- Seletor de período no shell (hoje / 7d / 30d / este mês / personalizado curto).
- RPC `admin_dashboard_daily_series(p_from, p_to)` com séries diárias explícitas.
- Widgets Recharts: GMV entregue (área) + caixa capturado/líquido (linha) — roles F8/caixa.
- Sem ECharts, sem PostHog, sem mutação no Painel.

## Glossário financeiro (fechado)

| Termo | Semântica | Série diária |
|-------|-----------|--------------|
| Pedidos criados | `orders` por `date(created_at AT TIME ZONE 'America/Sao_Paulo')` | `orders_created` |
| Pedidos entregues | status=`entregue`, dia = `date(coalesce(shipments.delivered_at, orders.updated_at))` | `orders_delivered` |
| GMV / Receita entregue | `sum(orders.total)` dos entregues no dia da entrega | `gmv_delivered` |
| Capturado | `sum(payments.amount)` status=`approved`, dia = `date(coalesce(paid_at, created_at))` | `captured` |
| Estornos | status=`refunded`, dia = created_at (ou paid_at se houver) | `refunded` |
| Líquido diário | capturado − estornos **no mesmo dia** (aproximação; não é caixa acumulado) | `net_day` |
| Pendente | snapshot atual (não série) — continua no widget caixa | — |
| Ticket médio | `gmv_delivered / nullif(orders_delivered,0)` no período | calculado no front |

**Nunca** misturar GMV (pedido entregue) com capturado (payment approved) no mesmo eixo sem label.

## Auth

- Série GMV/pedidos: `staff_can_view_reports_f8()`.
- Série caixa: `is_staff()` e role com path pagamentos/relatórios no front; RPC exige `is_staff()`.

## Fora

Tendência % vs período anterior (pode ser calculada no front na próxima). Insights IA.
