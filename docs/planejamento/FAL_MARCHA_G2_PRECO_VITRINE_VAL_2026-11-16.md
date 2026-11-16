# MARCHA G2 — Preço / vitrine / VAL

**Data:** 2026-11-16  
**Auth:** eFe — `marcha`  
**Plano:** [FAL_MVP_PLANO_CONSOLIDACAO.md](./FAL_MVP_PLANO_CONSOLIDACAO.md) §5  
**Classe:** MVP-bloqueador  
**SKU âncora:** `BRD2109`  
**Draft tip:** https://6afb4b44c2d649ae60636085--fal-pecas-automotivas-efe.netlify.app  
**Runtime:** `wtbpwuiayednvlhvuhbh`

---

## Resultado geral: **PASS**

| Passo | Status | Evidência |
|-------|--------|-----------|
| 2.1 Cinco pontos | **PASS** | Todos **R$ 61,45** (tabela abaixo) |
| 2.2 UI via resolve | **PASS** | `attachResolvedPrices` / `displayPrice` → `resolvedPrice`; Home usa mesma path |
| 2.3 % vitrine ↔ RPC | **PASS** | `store_payment_display.*_adjust_percent` = **0**; `apply_payment_condition_to_order` lê as mesmas cols |
| 2.4 Home/destaques | **PASS** | BRD2109 home = 61,45; TDI1083 home 31,97 = resolve lista `promocional` |

**Fix nesta marcha:** React **#310** na PDP — `useStorefrontDisplayAmount` após early-return em [`ProductPage.tsx`](../../fal-pecas/src/pages/Product/ProductPage.tsx). Hook movido para o topo.

**Gate G2:** **PASS**.

---

## 2.1 Planilha BRD2109

| Ponto | Valor | Fonte |
|-------|-------|-------|
| `resolve_product_price` | 61,45 | lista `preco-base` |
| `products.price` / list item | 61,45 | espelho (não SoT UI) |
| Card catálogo | R$ 61,45 | draft |
| PDP | R$ 61,45 · Pix R$ 61,45 | draft pós-fix |
| Carrinho | R$ 61,45 cada (lista) · R$ 61,45 à vista | draft |
| `order_items.unit_price` | 61,45 | 4 pedidos históricos |
| Checkout UI | = cart base (ajuste % = 0); create não forçado nesta marcha | — |

Com `%` zerados, vitrine à vista = preço resolvido = unit_price.

---

## 2.3 Condição %

```text
pix_adjust_percent = 0
debit_adjust_percent = 0
credit_adjust_percent = 0
RPC apply_payment_condition_to_order: uses_pix_pct + uses_credit_pct + store_payment_display = true
Vitest paymentConditionPricing + pricing: 22 PASS
```

---

## 2.4 Home

| SKU | Home | resolve |
|-----|------|---------|
| BRD2109 | R$ 61,45 | 61,45 (`preco-base`) |
| TDI1083 | R$ 31,97 (lista R$ 38,36) | 31,97 (`promocional`) |

---

## Deploy

| Item | Valor |
|------|-------|
| Draft | `6afb4b44c2d649ae60636085` |
| Prod | ainda Forbidden (dívida P0) |

---

## Próximo

**MARCHA G3** (checkout/pay smokes create→approve path).  
Dívida: `--prod` Netlify.
