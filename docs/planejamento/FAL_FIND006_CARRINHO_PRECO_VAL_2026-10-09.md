# FIND-006 / VAL — Carrinho = preço canônico

**Data:** 2026-10-09  
**Diagnóstico:** [FAL_FIND006_CARRINHO_PRECO_DIAGNOSTICO_2026-10-09.md](./FAL_FIND006_CARRINHO_PRECO_DIAGNOSTICO_2026-10-09.md)

---

## Alterado

| Arquivo | Mudança |
|---------|---------|
| `cartPricing.ts` | `applyResolvedPricesToCartItems` via `resolve_product_prices` |
| `supabaseCartService` | `loadRemoteCart` aplica resolve; sem fallback `promo??price` |
| `CartContext` | `displayPrice` no add; refresh pós-add; merge/login e guest hydrate resolvem |

**Não alterado:** `place_order` (já canônico).

---

## VAL

| Teste | Resultado |
|-------|-----------|
| Vitest `cartPricing` | **2 passed** |
| Lint | ok |

---

## Status

| FIND-006 | **fechado** (camada carrinho UX) |
| place_order | inalterado / canônico |
