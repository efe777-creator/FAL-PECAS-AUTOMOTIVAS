# FIND-006 — Diagnóstico carrinho vs preço canônico

**Data:** 2026-10-09  
**Modo:** somente leitura (diagnóstico) → correção em marcha seguinte do mesmo plano  
**Runtime:** `wtbpwuiayednvlhvuhbh`

---

## 1. Resumo executivo

O **cobrado** em `place_order` já usa `resolve_product_price` (**fato**).  
A **UX do carrinho** pode gravar/exibir `promo_price ?? price` (espelho) quando o snapshot é nulo ou o `Product` chega sem `resolvedPrice` — divergindo do canônico (**fato** código + SQL amostra).

---

## 2. Cadeia (fonte de cada número)

| Etapa | Fonte do preço | Tipo |
|-------|----------------|------|
| Card/PDP | `displayPrice` ← `resolvedPrice` (pós `attachResolvedPrices`) | **Fato** |
| `CartContext.addItem` | `resolvedPrice ?? promoPrice ?? price` | **Fato** |
| `saveRemoteCart` | `unit_price_snapshot = item.price` | **Fato** |
| `loadRemoteCart` | snapshot **ou** `promo_price ?? price` | **Fato** — fallback espelho |
| `CartPage` / checkout UI | `item.price` / `subtotal` | **Fato** |
| Checkout payload | só `{ productId, quantity }` | **Fato** |
| `place_order` | `resolve_product_price` por item | **Fato** SQL |

---

## 3. Evidência wtbp

Amostra 40 published+available:

| Métrica | Valor |
|---------|------:|
| resolve ≠ `products.price` | 0 |
| resolve ≠ `promo_price` (quando set) | 1 |
| resolve ≠ fallback carrinho (`promo ?? price`) | **1** |

Exemplo **SK3248**:

| Campo | Valor |
|-------|------:|
| mirror `price` | 50,00 |
| mirror `promo_price` | 37,99 |
| `resolve_product_price` | **50,00** |
| Fallback `loadRemoteCart` | **37,99** |

→ UX carrinho poderia mostrar R$ 37,99 e o pedido cobrar R$ 50,00.

---

## 4. Causas

| # | Tipo | Causa |
|---|------|-------|
| C1 | **Fato** | `loadRemoteCart` fallback para espelho se `unit_price_snapshot` null |
| C2 | **Fato** | `addItem` aceita `promoPrice`/`price` se `resolvedPrice` ausente |
| C3 | **Fato** | Incremento de qty em item existente **não** reavalia preço |
| C4 | **Relato** | FIND-006 parcial pós IMP-08/10 (Liberar ok; carrinho residual) |

---

## 5. Plano mínimo de correção

1. Função `applyResolvedPricesToCartItems(items)` via `resolve_product_prices`.
2. Usar após `loadRemoteCart` e após merge login (nunca cair no espelho sem resolve).
3. `addItem`: preferir `displayPrice` / `resolvedPrice`; se ausente e Supabase ok, resolver no sync seguinte.
4. Não alterar `place_order` (já canônico).
5. VAL: SK3248 (ou amostra) — preço no carrinho = resolve; vitest helper se couber.

---

## 6. Critérios de aceite

- [ ] Carrinho exibe amount de `resolve_product_prices`
- [ ] Reload remoto não usa `promo_price ?? price` sem resolve
- [ ] `place_order` inalterado / sem regressão
- [ ] FIND-006 atualizado

---

## 7. Status diagnóstico

| | |
|--|--|
| FIND-006 diagnóstico | **Concluído** |
| Divergência | **Confirmada** (caminho código + 1/40 SKUs) |
| Implementação | Segue no mesmo plano Sequence C (todo `fix-006`) |
