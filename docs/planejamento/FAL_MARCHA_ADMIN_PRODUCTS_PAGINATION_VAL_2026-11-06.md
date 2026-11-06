# VAL — Admin produtos: paginação visível

**Data:** 2026-11-06  
**Auth:** MARCHA sequencial  
**Item:** limiar 200 silencioso na listagem `/admin/produtos`

## Entrega

| Peça | Mudança |
|------|---------|
| `adminListProductsPage` | Retorna `{ items, hasMore }` com `hasMore` pela página bruta do banco (antes do filtro «Sem imagem») |
| `adminListProducts` | Wrapper compatível (`Product[]`) para callers de busca/autocomplete |
| `AdminProductsPage` | Banner âmbar + «Carregar mais produtos»; offset DB independente do filtro client; `useDocumentTitle` |

## Critérios

- [x] `tsc --noEmit` OK
- [x] Padrão alinhado a `AdminCustomersPage` (aviso + botão)
- [x] Callers de `adminListProducts` inalterados na assinatura

## Gate humano

Nenhum nesta fatia. Gates Publish/pagamento/ME/sinônimos/D-FRETE C permanecem.
