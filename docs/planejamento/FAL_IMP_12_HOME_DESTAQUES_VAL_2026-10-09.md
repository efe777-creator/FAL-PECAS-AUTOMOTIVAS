# FAL-IMP-12 / VAL-12 — Home / destaques / promoções

**Data:** 2026-10-09  
**Gate:** Onda 2  
**Runtime:** `wtbpwuiayednvlhvuhbh`

---

## 1. Auditado

| Item | Achado |
|------|--------|
| `listFeaturedProducts` | Alias de published recentes — sem flag destaque |
| Seção “Suspensão e direção” | Chamava **o mesmo** `useFeaturedProducts(8)` — cópia dos destaques, não da linha |
| Link “Ver mais” | `/catalogo?q=suspensao` (texto) em vez de `cat=suspensao` |
| Cadeia promo | Lista promo com 99 itens; resolve ≈ preço base no sample → **0** ofertas reais (list > pay) |
| RPC por categoria | `suspensao` → 48; `direcao` → 52 (filhos inclusos) |

---

## 2. Alterado

| Camada | Mudança |
|--------|---------|
| `productService` | Destaques preferem `is_available`; `listPromoHighlightProducts`; `listProductsByCategorySlug` via `searchCatalog` |
| `useCatalog` | `usePromoHighlightProducts`; `useCategoryProducts(slugs)` |
| `HomePage` | Destaques honestos; Ofertas **só se** houver preço resolvido &lt; lista; linha Suspensão/Direção por categorias; link `?cat=suspensao`; empty/error por seção |

**Não alterado:** schema `is_featured`; admin de curadoria de home; F11; FIND-012.

---

## 3. VAL-12

| Teste | Resultado |
|-------|-----------|
| Browser `/` | Destaques + Categorias + Suspensão e direção com cards |
| Copy destaques | “preferência aos disponíveis na loja” |
| Link linha | `/catalogo?cat=suspensao` presente |
| Ofertas | Oculta quando 0 ofertas reais (SQL sample: 0) — **correto** |
| Lint | sem erros novos |

---

## 4. Status

| | |
|--|--|
| FAL-IMP-12 | **Concluído** |
| FAL-VAL-12 | **PASS** |
| Próximo (protocolo) | `FAL-IMP-13` Clientes · ou paralelo MP / FIND-006 |
