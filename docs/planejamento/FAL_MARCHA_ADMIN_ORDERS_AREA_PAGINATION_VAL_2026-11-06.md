# VAL — Admin pedidos: paginação em áreas e visões

**Data:** 2026-11-06  
**Auth:** MARCHA sequencial  
**Item:** cap 200 silencioso em `/admin/pedidos/:área` e visões (lista avançada já tinha Carregar mais)

## Entrega

| Página | Mudança |
|--------|---------|
| `AdminOrdersAreaPage` | Banner + «Carregar mais pedidos»; `offset`/`limit` |
| `AdminOrdersViewPage` | Idem |

Hub continua com amostra (atenção/recentes) + contadores RPC — sem lista completa.

## Critérios

- [x] `tsc --noEmit` OK
- [x] Padrão alinhado à lista avançada

## Gate humano

Nenhum nesta fatia.
