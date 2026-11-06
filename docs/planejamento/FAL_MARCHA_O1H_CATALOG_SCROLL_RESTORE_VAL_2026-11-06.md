# VAL — O1-H residual: scroll catálogo ↔ PDP

**Data:** 2026-11-06  
**Auth:** MARCHA sequencial  
**Item:** voltar da PDP ao catálogo preserva posição

## Entrega

| Peça | Mudança |
|------|---------|
| `ScrollToTop` | Não rola ao topo em navegação `POP` (voltar/avançar) |
| `catalogScroll` | Persiste `scrollY` em `sessionStorage` por pathname+search |
| `CatalogPage` | Após load em `POP`, restaura Y salvo |

## Critérios

- [x] `tsc --noEmit` OK
- [x] `vitest` `catalogScroll.test.ts` OK

## Gate humano

Nenhum nesta fatia.
