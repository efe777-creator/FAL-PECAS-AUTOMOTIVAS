# MARCHA VAL — Painel cockpit operacional

**Data:** 2026-11-17  
**Spec:** [2026-11-17-painel-cockpit-design.md](../superpowers/specs/2026-11-17-painel-cockpit-design.md)  
**Rota:** `/admin`

## Entregue

| Item | Status |
|------|--------|
| Spec cruzando PRD | PASS |
| Prefs `localStorage` + atalhos pináveis | PASS — `adminDashboardPrefs` / `adminDashboardShortcuts` + testes |
| Controles rápidos (Links + 1º da fila) | PASS — sem mutação de status no Painel |
| Pipeline visual `ADMIN_ORDER_GROUPS` | PASS — barras CSS + deep-link lista |
| Widgets caixa + filas | PASS — `adminCentralIndicators` + `adminLogisticsQueueCounts` |
| KPIs sem emoji | PASS |
| Smoke dark/light | checklist abaixo |

## Smoke manual (eFe)

1. `/admin` — dark default; toggle claro/escuro; superfícies `fal-surface` legíveis  
2. Controles rápidos → Análise / Separação / Expedição / Aguardando pag. / Relatórios  
3. “Abrir 1º da fila” → detalhe do 1º item de atenção (ou “Fila vazia”)  
4. Pin/desafixar atalho; F5 persiste pins  
5. Pipeline: clique no grupo abre `/admin/pedidos/lista?grupo=…`  
6. Caixa (role F8/pagamentos): líquido / capturado / pendente  
7. Filas logística: 4 links com contagens  
8. Nenhum botão no Painel avança status / emite etiqueta  

## Correções pós-análise (2026-11-17)

| Bug | Correção |
|-----|----------|
| Atenção puxava últimos N de *todos* status | `adminListOrders` com `ATTENTION_STATUSES` (igual Central) |
| Unpin all → remount restaurava defaults | `read` respeita `pinned: []` se a chave existir |
| KPIs GMV/relatórios linkavam sem role F8 | KPIs de relatório só se `canAccessAdminPath('/admin/relatorios')` |
| Caixa/filas fetch desalinhado do widget | Fetch só quando o widget é visível |

## Testes

```bash
cd fal-pecas && npx vitest run src/lib/adminDashboardPrefs.test.ts
```
