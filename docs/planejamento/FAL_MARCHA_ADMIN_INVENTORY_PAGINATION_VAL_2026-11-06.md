# VAL — Admin estoque: paginação visível

**Data:** 2026-11-06  
**Auth:** MARCHA sequencial  
**Item:** limiar 200 silencioso em `/admin/estoque`

## Entrega

| Peça | Mudança |
|------|---------|
| `AdminInventoryPage` | Banner âmbar + «Carregar mais estoque»; `hasMore` por página cheia; contador no subtítulo |
| Serviço | Já tinha `offset`/`limit` (`ADMIN_INVENTORY_PAGE_SIZE`); UI passa a usá-los |
| Título | `useDocumentTitle('Estoque \| Admin FAL')` |

## Critérios

- [x] `tsc --noEmit` OK
- [x] Padrão alinhado a pedidos/clientes/produtos

## Gate humano

Nenhum nesta fatia.
