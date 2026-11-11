# VAL — Busca P0 Interpreter + RPC year-range

**Data:** 2026-11-11  
**Projeto:** `owllmfcpbodqmoerdfxx`  
**Migration aplicada:** `search_products_year_range_prod_compat`

## SQL pós-RPC

| Teste | Resultado |
|-------|-----------|
| HYUNDAI HB20 year=2015 | TDI2116, TDI2117 (total 2) PASS |
| HYUNDAI HB20 year=2012 | TDI2116, TDI2117 PASS |
| q=TDI2116 | 1 hit PASS |

## Código

| Item | Status |
|------|--------|
| `interpretSearchQuery` + Vitest | 6/6 PASS |
| `buildCatalogSearchParams` + Vitest | 2/2 PASS |
| SearchBar → URL estruturada | Implementado |
| `searchCatalog` defesa (só q) | Implementado |
| CatalogPage applySearch + empty | Implementado |

## Critérios Onda 1

- [x] SQL HB20 2015 retorna TDI*
- [x] Parser HB20 2015 → model+year sem q
- [x] TDI2116 hit por código
- [ ] E2E browser site publicado (pendente deploy front)
- [ ] Total texto = seletor após deploy front

## Pendências comerciais (Onda 2)

- BRD2109 ausente — não inventar; aguarda confirmação eFe / reimport
- Preços TDI* = 0,00 — não inventar valor
