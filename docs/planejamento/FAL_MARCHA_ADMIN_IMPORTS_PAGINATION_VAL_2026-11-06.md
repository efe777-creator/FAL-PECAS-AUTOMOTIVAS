# VAL — Admin importações: paginação visível

**Data:** 2026-11-06  
**Auth:** MARCHA sequencial  
**Item:** limiar 150 silencioso em `/admin/importacoes`

## Entrega

| Peça | Mudança |
|------|---------|
| `ADMIN_IMPORTS_PAGE_SIZE` | Constante 150; `adminListImports` aceita `offset` via `.range` |
| `AdminImportsPage` | Banner âmbar + «Carregar mais importações»; contador no subtítulo |
| Título | `useDocumentTitle('Importações \| Admin FAL')` |

## Critérios

- [x] `tsc --noEmit` OK
- [x] Caller `adminListPriceListImports` (limit 100) permanece compatível

## Gate humano

Nenhum nesta fatia.
