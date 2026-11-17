# Design — Painel cockpit operacional

**Data:** 2026-11-17 · **Status:** predecessor (sucedido pela Marcha A modular)  
**Sucessor:** [painel-modular-avancado-design](./2026-11-17-painel-modular-avancado-design.md)  
**Rota:** `/admin` · **Arquivo:** `fal-pecas/src/pages/admin/AdminDashboardPage.tsx`  
**Cruzamento:** PRD 4.0 §3 / §7 / RF07 · Mapa jornadas D–E · Overview UI (H1 Painel)

## Papel

`/admin` = **cockpit**: ver fluxo + filas + atalhos + widgets e pular para a ação certa.  
Mutações (status, etiqueta, packing) ficam na Central `/admin/pedidos` e no detalhe — um contrato, sem segundo canal.

## Layout

1. Header + link Central  
2. Controles rápidos (Links do funil)  
3. Atalhos pináveis (`localStorage`)  
4. Pipeline visual do fluxo (`ADMIN_ORDER_GROUPS` + barras CSS)  
5. KPIs + widgets caixa/filas  
6. Tabela atenção + links Relatórios/Central  

## Dados

| Bloco | Fonte |
|-------|--------|
| Pipeline / KPIs status | `admin_order_status_counts` |
| Atenção | `adminListOrders` |
| Caixa | `admin_central_indicators` (`payments`) |
| Filas | `admin_logistics_queue_counts` |
| GMV entregue | `admin_orders_basic_totals` (F8; label ≠ caixa) |

## Fora

Série temporal / Recharts · drag-grid · avançar status no Painel · WA agentic.
