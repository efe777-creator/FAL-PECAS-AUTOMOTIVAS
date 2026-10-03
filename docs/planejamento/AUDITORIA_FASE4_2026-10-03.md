# Auditoria Fase 4 — 2026-10-03

**STATUS: APROVADA**

**Escopo:** Motor de busca server-side (RPC + `searchCatalog` + UI catálogo).  
**Referência:** [ESPECIFICACAO_FASE4_MOTOR_BUSCA.md](./ESPECIFICACAO_FASE4_MOTOR_BUSCA.md) · [EXECUCAO_FASE4.md](./EXECUCAO_FASE4.md)  
**Branch:** `plan` — **sem push**.

---

## Critérios CA

| ID | Resultado | Evidência |
|----|-----------|-----------|
| CA-01 | OK | SQL+browser: `PVI1032` → TEST-001 (score ref exata 800) |
| CA-02 | OK | SQL: `Nakata PVI1032` → TEST-001 (AND termos) |
| CA-03 | OK | SQL+browser: `Pivô Palio` → TEST-001 + TEST-002 |
| CA-04 | OK | SQL+browser: Fiat+Palio+2015 → só TEST-001 |
| CA-05 | OK | SQL: q/`engine` `1.0` → TEST-001; `1.4` → TEST-002 |
| CA-06 | OK | Archived (FAL-SEED / F4-PAGE) fora da RPC |
| CA-07 | OK | Contador UI = `total_count` (ex.: 32 com fixtures) |
| CA-08 | OK | Browser: Carregar mais 24→32; URL `?page=2` |
| CA-09 | OK | UI seletor Ordenar (relevance/price/name) |
| CA-10 | OK | URL mantém `q/cat/maker/model/year/engine/version/brand` + `sort`/`page` |

---

## Entregas

| Item | Detalhe |
|------|---------|
| Migration índices | `20261003230000_fase4_search_indexes.sql` — `unaccent`, `f_unaccent`, `products_brand_id_idx`, `products_search_document_idx` |
| Migration RPC | `20261003240000_fase4_search_products_rpc.sql` — `search_products` SECURITY INVOKER |
| Contrato TS | `ProductSearchParams` / `ProductSearchSort` / `ProductSearchResult` |
| Service | `src/services/search/searchService.ts` → `searchCatalog` |
| UI | `CatalogPage` só via `searchCatalog`; sort + Carregar mais |
| Fixtures paginação | 30× `F4-PAGE-*` criadas published → **arquivadas** após CA-08 |

---

## Build / lint

- `npm run build` — OK (`tsc -b && vite build`)
- Catálogo tipado sem erros

---

## UX smoke (browser)

| Cenário | OK |
|---------|----|
| `/catalogo?q=PVI1032` → 1 produto TEST-001 | sim |
| `/catalogo?q=Pivô Palio` → 2 produtos | sim |
| `/catalogo?maker=Fiat&model=Palio&year=2015` → TEST-001 | sim |
| Catálogo com fixtures: 32 · mostrando 24 + Carregar mais | sim |
| Após load more: 32 cards, `?page=2`, sem botão | sim |
| Seletor Ordenar presente | sim |

---

## Pendências / dívida

1. Imagens reais nos produtos de validação.
2. Carga comercial ampla (admin).
3. Conta/checkout — Fases 5–6.
4. Hardening `profiles.role` (dívida F3).
5. Opcional: índice trigram se volume crescer.

## Bugs conhecidos

- Nenhum bloqueante.
- Em viewport estreita, bottom nav pode interceptar clique no “Carregar mais” (scroll resolve; validado via click programático).

## Itens de fases futuras

| Item | Fase |
|------|------|
| Conta / perfil / veículos salvos | 5 |
| Checkout / pedidos | 6 |
| Busca por placa | fora / futuro |
| Meilisearch/ES | fora |
