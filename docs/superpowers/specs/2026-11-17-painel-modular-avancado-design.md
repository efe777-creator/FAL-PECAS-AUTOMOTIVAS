# Design — Painel modular avançado (Marcha A)

**Data:** 2026-11-17 · **Status:** implementação Marcha A  
**Predecessor:** [painel-cockpit-design](./2026-11-17-painel-cockpit-design.md)  
**Rota:** `/admin`

## Papel (inalterável)

Visualização + priorização + deep-link. Mutações na Central `/admin/pedidos` e no detalhe.

## Arquitetura A

Shell → Registry (available/active) → LayoutEngine (`react-grid-layout`) → widgets.  
DataProvider compartilhado por fonte. Persistência layout versionada em `localStorage` (chave separada dos pins).

## Persistência

- Layout: `fal-admin-dashboard-layout-v1` (`version: 1`, sanitize, dedupe, drop unauthorized/retired, fallback).
- Pins: `fal-admin-dashboard-prefs-v1` (inalterado semanticamente).
- Sem tabela Supabase na A.

## Auth

Registry + sanitize + revalidação na montagem. RPCs F8/caixa gated no server. UI ≠ segurança.

## Glossário financeiro (pré-Marcha B)

| Termo | Semântica | Fonte A |
|-------|-----------|---------|
| Receita entregue (GMV) | Pedidos entregues — ≠ caixa | `admin_orders_basic_totals` |
| Líquido / capturado / pendente / estorno | Fluxo `payments` | `admin_central_indicators` |
| Ticket médio / série / tendência % | Só Marcha B | — |

## Fora da A

Recharts · shadcn wholesale · PostHog/Datadog/IA · dnd-kit · tabela layout server.

## Marcha B

Implementada — ver [painel-modular-b-series-design](./2026-11-17-painel-modular-b-series-design.md).
