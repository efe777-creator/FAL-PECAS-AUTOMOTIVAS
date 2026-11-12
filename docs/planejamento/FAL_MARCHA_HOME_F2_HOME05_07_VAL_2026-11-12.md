# VAL — MARCHA Frente 2 · HOME-05 + HOME-07 (+ B-05)

**Data:** 12/11/2026  
**Auth:** eFe — `MARCHA`  
**Projeto:** `wtbpwuiayednvlhvuhbh`  
**Fatia anterior:** [FAL_MARCHA_HOME_F2_DESTAQUES_B06_VAL_2026-11-12.md](./FAL_MARCHA_HOME_F2_DESTAQUES_B06_VAL_2026-11-12.md)

---

## Entregas

| ID | Item | Evidência |
|----|------|-----------|
| HOME-05 / B-03 | Selo + % + strike unificados card/PDP | `promoPresentation.ts` · `ProductCard` · `ProductPage` |
| HOME-07 / B-04 | Toggles selo/% + aba Config | migration `20261112220000_…` + admin Config |
| B-05 | Copy Destaques ≠ Ofertas ≠ Promoções | bloco ajuda `AdminHomeContentPage` |
| B-06 | (fatia anterior) lista inactive | Promoções |

---

## Cenários

| # | Cenário | Esperado | Resultado |
|---|---------|----------|-----------|
| 1 | `resolvePromoOffer(100,80)` | `-20%` no selo | **PASS** (vitest) |
| 2 | Desconto &lt; 1% | selo sem % | **PASS** (vitest) |
| 3 | Apply remoto flags | colunas `show_oferta_badge` / `show_discount_percent` | **PASS** (`db query --remote`) |
| 4 | Defaults | ambos `true` | **PASS** (select remoto) |
| 5 | Config não altera resolve | só UI presentation | **PASS** (sem touch em `resolve_product_price`) |
| 6 | PIX% não anunciado | copy adiado na Config | **PASS** |

---

## Pendente eFe (Frente 3 / UI)

- Smoke visual card→PDP com SKU promocional real (Lista Promocional active).  
- Toggle Config off/on selo e % na vitrine.  
- C-01…C-05 do gate pós-F1.

---

**Assinatura:** MARCHA F2 HOME-05/07 código+apply PASS · 12/11/2026.
