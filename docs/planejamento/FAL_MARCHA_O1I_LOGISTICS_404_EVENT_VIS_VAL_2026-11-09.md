# VAL — 404 logística + visibilidade de eventos

**Data:** 2026-11-09  
**Auth:** MARCHA (código local — sem commit/push)  
**Item:** O1-I / O0-C — router logística + `AdminOrderDetailPage`

## Entrega

- `logistica/:slug` desconhecido → `AdminNotFoundPage` (não mais placeholder stub)
- Removido `AdminLogisticsPlaceholderPage`
- Eventos: `(customer|internal)` → `visível ao cliente` / `interno`

## Critérios

- [x] Vitest labels PASS
- [x] `tsc --noEmit` OK
- [x] Rotas reais ME/caixas/config intactas

## Gate humano

Nenhum. Ship git sob demanda.
