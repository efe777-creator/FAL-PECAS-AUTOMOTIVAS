# VAL — MARCHA Onda 2 · Busca e SEO (pacote 1)

**Data:** 2026-11-05  
**Auth:** eFe — `MARCHA`  
**Plano:** [FAL_PLANO_MESTRE_SITE_2026-11-05.md](./FAL_PLANO_MESTRE_SITE_2026-11-05.md) §4 Onda 2

---

## Escopo (pacote 1)

SearchBar premium (combobox + thumb/preço + “Ver todos”) · `document.title` · JSON-LD Product · `robots.txt` + sitemap estático mínimo · cache de categorias 5 min.

**Fora:** RPC leve de sugestões · facetas Grupo/Subgrupo · slug PDP · sitemap dinâmico de produtos · batch favoritos N+1.

---

## Critérios

| # | Critério | Resultado |
|---|----------|-----------|
| 1 | SearchBar: listbox + ↑↓ Enter Esc | **PASS** |
| 2 | Sugestão com imagem + preço + “Ver todos os resultados” | **PASS** |
| 3 | `useDocumentTitle` em Home / Catálogo / PDP | **PASS** |
| 4 | JSON-LD Product na PDP | **PASS** |
| 5 | `public/robots.txt` + `sitemap.xml` (rotas principais) | **PASS** |
| 6 | Cache `listCategories` / `listAllCategories` 5 min + invalidate no admin upsert | **PASS** |
| 7 | `tsc --noEmit` | **PASS** |

---

## STOP / próximo pacote Onda 2

1. Facetas Categoria→Grupo→Subgrupo no catálogo  
2. Batch `listFavoriteIds` no `ProductCard`  
3. Rota PDP por slug + redirect id  
4. RPC leve `search_product_suggestions`  
5. Sitemap dinâmico de produtos  

**Assinatura:** VAL Onda 2 P1 PASS 2026-11-05.
