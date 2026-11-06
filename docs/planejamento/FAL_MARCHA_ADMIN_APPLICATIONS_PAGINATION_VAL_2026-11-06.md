# VAL — Admin aplicações: Carregar mais

**Data:** 2026-11-06  
**Auth:** MARCHA sequencial  
**Item:** lote 250 com aviso, sem forma de ampliar (`/admin/aplicacoes`)

## Entrega

| Peça | Mudança |
|------|---------|
| `ADMIN_APPLICATIONS_PAGE_SIZE` | Constante 250 no serviço (default da listagem) |
| `AdminApplicationsPage` | Banner + botão «Carregar mais aplicações»; `offset` acumulado; `hasMore = rows.length < total` |
| Título | `useDocumentTitle('Aplicações \| Admin FAL')` |

## Critérios

- [x] `tsc --noEmit` OK
- [x] Serviço já tinha `offset`/`total`; UI passa a usá-los além do aviso

## Gate humano

Nenhum nesta fatia.
