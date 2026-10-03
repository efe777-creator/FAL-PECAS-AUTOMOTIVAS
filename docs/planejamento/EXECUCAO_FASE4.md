# Execução Fase 4 — Motor de Busca

**Branch:** `plan`  
**Spec:** [ESPECIFICACAO_FASE4_MOTOR_BUSCA.md](./ESPECIFICACAO_FASE4_MOTOR_BUSCA.md)  
**Auditoria:** [AUDITORIA_FASE4_2026-10-03.md](./AUDITORIA_FASE4_2026-10-03.md) — **APROVADA**  
**Projeto Supabase:** `wtbpwuiayednvlhvuhbh`  
**Regra:** sem push; sem antecipar F5/F6.

## Checklist de módulos

| Módulo | Status | Notas |
|--------|--------|-------|
| F4-M1 Contrato + índices + docs | [x] | Migration `20261003230000_fase4_search_indexes.sql`; tipos; `searchService` |
| F4-M2 Motor RPC | [x] | Migration `20261003240000_fase4_search_products_rpc.sql`; testes SQL OK |
| F4-M3 UI catálogo | [x] | `CatalogPage` → só `searchCatalog`; sort + Carregar mais |
| F4-M4 Auditoria | [x] | `AUDITORIA_FASE4_2026-10-03.md`; ROADMAP; fixtures arquivadas |

## Migrations

1. `fal-pecas/supabase/migrations/20261003230000_fase4_search_indexes.sql`
2. `fal-pecas/supabase/migrations/20261003240000_fase4_search_products_rpc.sql`

## Arquivos principais (frontend)

- `src/types/index.ts` — `ProductSearchParams` / `ProductSearchSort` / `ProductSearchResult`
- `src/services/search/searchService.ts` — `searchCatalog`
- `src/pages/Catalog/CatalogPage.tsx`
- `src/hooks/useCatalog.ts` — sugestões header via `searchCatalog`

## Índices inspecionados (pré-M1)

Já existiam: `products_status_idx`, `products_category_idx`, `products_sku_key`, `product_references_code_idx`, `pvc_product_idx`, `pvc_version_idx`, `vehicle_versions_filter_idx`.

Adicionados na M1: `unaccent` (schema `extensions`), `f_unaccent`, `products_brand_id_idx`, `products_search_document_idx`.

## Decisões tomadas

- RPC única com ranking + filtros + `total_count` + offset.
- UI: Carregar mais; backend continua page/offset.
- NULL estrito F3 permanece nos filtros de veículo.
- Fixtures de paginação: criadas → validadas → arquivadas (`F4-PAGE-*`).

## Checkpoints

- Após cada módulo: build/lint OK.
- Após M2: testes SQL PVI1032 / Nakata / Pivô Palio / Fiat+Palio+2015 / 1.0 vs 1.4 / archived fora.
- Após M4: auditoria APROVADA; sem push.
