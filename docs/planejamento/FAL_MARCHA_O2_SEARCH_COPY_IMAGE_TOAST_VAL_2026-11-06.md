# VAL — copy SearchBar×catálogo + toast image SKU

**Data:** 2026-11-06  
**Auth:** MARCHA  
**Itens:** Inventário busca copy · toast residual fino

## Entrega

| Peça | Mudança |
|------|---------|
| `lib/searchCopy` | `SEARCH_INPUT_PLACEHOLDER` + `SEARCH_CATALOG_HINT` |
| `SearchBar` / `CatalogPage` | Usam o mesmo placeholder/hint |
| `AdminImageSkuImportPage` | Erros preview/apply/reanalisar → toast + banner |
| Inventário | SearchBar copy + toast admin → **MANTER** |

## Critérios

- [x] `tsc --noEmit` OK
- [x] Inventário O1-A sem item **CONSOLIDAR** aberto (só gates humanos / Ondas)

## Gate humano

Nenhum. Gemini/IA API permanece standby.
