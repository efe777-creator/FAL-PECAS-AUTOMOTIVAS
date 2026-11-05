# VAL — MARCHA Onda 2 · Path classificação na PDP

**Data:** 2026-11-05  
**Auth:** eFe — `MARCHA`

---

## Escopo

Breadcrumb completo **Início / Catálogo / Categoria / Grupo / Subgrupo / produto** · cada nível linka `?cat=` · JSON-LD `BreadcrumbList`.

---

## Critérios

| # | Critério | Resultado |
|---|----------|-----------|
| 1 | `categoryChainById` / `BySlug` sobe `parent_id` | **PASS** (unit) |
| 2 | PDP usa `listAllCategories` (cache) e renderiza cadeia | **PASS** |
| 3 | Fallback folha (`categoryName`/`slug`) se cadeia vazia | **PASS** |
| 4 | JSON-LD BreadcrumbList | **PASS** |
| 5 | `tsc --noEmit` + vitest path | **PASS** |

---

## STOP

Próximo Onda 2: RPC leve `search_product_suggestions` · sitemap dinâmico de produtos.

**Assinatura:** VAL PDP path classificação PASS 2026-11-05.
