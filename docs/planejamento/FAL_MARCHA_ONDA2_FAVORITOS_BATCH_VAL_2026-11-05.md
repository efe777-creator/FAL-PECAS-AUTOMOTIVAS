# VAL — MARCHA Onda 2 · Favoritos em lote

**Data:** 2026-11-05  
**Auth:** eFe — `MARCHA`  
**Plano:** Onda 2 · 1 query por lista (não 2 por card)

---

## Escopo

Eliminar N+1 de `isFavorite` nos grids (Home, Catálogo, Favoritos, relacionados).

---

## Critérios

| # | Critério | Resultado |
|---|----------|-----------|
| 1 | `listFavoriteProductIds()` — 1 SELECT | **PASS** |
| 2 | `FavoritesProvider` carrega set no login | **PASS** |
| 3 | `ProductCard` / PDP usam context (sem fetch por card) | **PASS** |
| 4 | `toggleFavorite(..., currentlyLiked)` sem SELECT extra | **PASS** |
| 5 | `tsc --noEmit` | **PASS** |

---

## STOP

Próximo Onda 2: slug PDP · RPC sugestões leve.

**Assinatura:** VAL favoritos batch PASS 2026-11-05.
