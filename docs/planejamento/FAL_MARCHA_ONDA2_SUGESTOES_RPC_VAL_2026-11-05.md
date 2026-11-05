# VAL — MARCHA Onda 2 · RPC leve sugestões

**Data:** 2026-11-05  
**Auth:** eFe — `MARCHA`  
**Runtime:** `wtbpwuiayednvlhvuhbh`

---

## Escopo

RPC `search_product_suggestions(p_q, p_limit)` · SearchBar deixa de chamar `search_products` + enrich pesado.

---

## Critérios

| # | Critério | Resultado |
|---|----------|-----------|
| 1 | Migration `20261105190000_search_product_suggestions.sql` no wtbp | **PASS** (`db query --remote`) |
| 2 | Grant `anon` + `authenticated` | **PASS** |
| 3 | Smoke `bieleta` → 6 linhas (slug/score) | **PASS** |
| 4 | Resolve + `image_path` só no top-N | **PASS** (SQL) |
| 5 | `useProductSearch` → `searchProductSuggestions` | **PASS** |
| 6 | `tsc --noEmit` | **PASS** |

---

## STOP

Próximo Onda 2 residual: sitemap dinâmico de produtos. Depois Onda 3 (home comercial) ou gate D-FRETE C (humano).

**Assinatura:** VAL Onda 2 sugestões RPC PASS 2026-11-05.
