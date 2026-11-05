# VAL — MARCHA Onda 4 · Prep IA na busca (22)

**Data:** 2026-11-05  
**Auth:** eFe — `MARCHA`

---

## Escopo

Prep **sem modelo vetorial**: documento de busca canônico + sinônimos + flag de expansão na query. Sem pgvector / embedding nesta onda.

---

## Critérios

| # | Critério | Resultado |
|---|----------|-----------|
| 1 | `build_product_search_document` + `rebuild_product_search_documents` no wtbp | **PASS** (rebuild 100 produtos) |
| 2 | Doc inclui nome/SKU/ref/marca/categoria/refs + sinônimos reversos | **PASS** (24 docs com `shock`) |
| 3 | Tabela `search_synonyms` + seed + RLS | **PASS** |
| 4 | Flag `store_search_prep.synonym_expansion_enabled` default **false** | **PASS** |
| 5 | Admin `/admin/busca` (rebuild, toggle, CRUD sinônimos) | **PASS** |
| 6 | `searchCatalog` / sugestões passam por `prepareSearchQuery` | **PASS** |
| 7 | Save produto chama rebuild do id | **PASS** |
| 8 | Hotfix trigger `log_product_measure_changes` (`logistic_porte`) | **PASS** (bloqueava UPDATE) |
| 9 | Unit `searchQueryExpand` + `tsc` | **PASS** |

---

## Artefatos

- `fal-pecas/supabase/migrations/20261105220000_search_prep_ia.sql`
- Fix local: `20261105160000_product_measure_change_history.sql` (`logistic_porte`)
- `fal-pecas/src/lib/searchQueryExpand.ts` (+ test)
- `fal-pecas/src/services/search/searchPrepService.ts`
- Wire: `searchService.ts`, `adminProductService.ts`
- `fal-pecas/src/pages/admin/search/AdminSearchPrepPage.tsx` + router/dashboard

---

## STOP

Próximo Onda 4: **relacionados curados (26)** · ou gates humanos (D-FRETE / ME / ligar pagamento / expansão de sinônimos).

**Assinatura:** VAL Onda 4 prep IA busca PASS 2026-11-05.
