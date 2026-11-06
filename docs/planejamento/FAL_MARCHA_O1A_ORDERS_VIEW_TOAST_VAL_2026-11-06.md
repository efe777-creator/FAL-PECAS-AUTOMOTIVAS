# VAL — O1-A: toast nas visões de pedidos

**Data:** 2026-11-06  
**Auth:** MARCHA  
**Item:** residual toast — `AdminOrdersViewPage` só usava banner de erro

## Entrega

| Peça | Mudança |
|------|---------|
| `AdminOrdersViewPage` | `pushError` via `useToast` em reload / carregar mais |

## Critérios

- [x] Falha de carga → banner (painel) + toast
- [x] Falha em “Carregar mais” → banner + toast
- [x] `tsc -b` OK

## Gate humano

Nenhum.
