# VAL — O1-A lista avançada → AdminOrdersListPanel

**Data:** 2026-11-06  
**Auth:** MARCHA  
**Item:** Tabela pedidos duplicada

## Entrega

| Peça | Mudança |
|------|---------|
| `AdminOrdersListPanel` | Prop `showItemCount` |
| `AdminOrdersPage` | Remove tabela própria; usa o painel |
| Hub | Mantém cards/resumo (não é a mesma tabela) |
| Áreas | Já usavam o painel |

## Critérios

- [x] `tsc --noEmit` OK
- [x] Inventário atualizado

## Gate humano

Nenhum.
