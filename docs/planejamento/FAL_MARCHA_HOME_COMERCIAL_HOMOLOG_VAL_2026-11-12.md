# VAL — MARCHA HOME-08 · Homologação integrada Home Comercial (Frente 3)

**Data:** 12/11/2026  
**Auth:** eFe — `MARCHA`  
**Projeto:** `wtbpwuiayednvlhvuhbh`  
**SKU smoke:** TDI1006 (`50269e74-7ef8-4393-9f63-2e55741d9b04`)  
**Script:** `fal-pecas/supabase/scripts/smoke_home08_f3_promo.sql`

**Pré-requisitos F1/F2:**  
[FAL_ANALISE_POS_F1…](./FAL_ANALISE_POS_F1_HOME_COMERCIAL_2026-11-12.md) ·  
[FAL_MARCHA_HOME_F2_DESTAQUES_B06_VAL…](./FAL_MARCHA_HOME_F2_DESTAQUES_B06_VAL_2026-11-12.md) ·  
[FAL_MARCHA_HOME_F2_HOME05_07_VAL…](./FAL_MARCHA_HOME_F2_HOME05_07_VAL_2026-11-12.md)

---

## Matriz C-01…C-05

| ID | Cenário | Evidência | Resultado |
|----|---------|-----------|-----------|
| **C-01** | Lista + item + promo → preço; UI admin + loja | SQL ON=`40/promocional`; PDP `R$ 40,00` + riscado `47,25`; estimativa frete `R$ 40,00` (após fix); carrinho `R$ 40,00 cada`; admin Destaques/Config/B-06 | **PASS** (PDP+carrinho). Checkout/pedido pago: **parcial** (não executado nesta MARCHA) |
| **C-02** | 022-E1 formal (integridade resolve / gate) | Script + storefront; pós-cleanup lista `inactive`, resolve Base | **PASS** (núcleo preço). place_order snapshot: **adiado** |
| **C-03** | Parcelas display on/off | Remoto `store_payment_display.enabled=true`, max=3; vitest `paymentDisplay.test.ts` (off→1x, on→resolve, assert teto) | **PASS** (política). Checkout Brick end-to-end: **parcial** (trilha 035) |
| **C-04** | Busca/legado `promo_price` vs resolved | `searchService` chama `attachResolvedPrices`; `displayPrice` prioriza `resolvedPrice` (vitest 3 casos) | **PASS**. Coluna SQL legado residual: residual P2 aceito |
| **C-05** | Homolog HOME-08 (este doc) | Integra F1 gate + F2 + smokes acima | **PASS** com ressalvas parciais |

---

## Correções encontradas na homolog

| Bug | Correção |
|-----|----------|
| `/admin/home/promocoes` crash `options.map` undefined | `Select` exige prop `options` — `AdminPromotionsPage` |
| Estimativa frete PDP usava `product.price` (lista) | `displayPrice(product)` em `ProductShippingQuoteBlock` |
| B-07 | Filtro Situação (ativa/agendada/expirada/inativa) na lista Promoções |

---

## Cenários §10 (síntese)

| Área | Cobertura nesta MARCHA |
|------|-------------------------|
| Destaques | Admin prévia + preço resolvido; independência promo (sem write featured) |
| Promoções | Gate ON/OFF SQL; B-06 lista inactive; 0 promo active em prod pós-cleanup |
| Pagamentos | Display + teto checkout unitário; PIX% adiado (D-01) |
| Integridade | Resolve + cleanup; pedido snapshot = próximo ops |

---

## Estado remoto pós-smoke

| Item | Valor |
|------|-------|
| Lista Promocional | `inactive` |
| Itens smoke TDI1006 na promo | `0` |
| Resolve TDI1006 | `47.25` / `preco-base` |
| `show_oferta_badge` / `show_discount_percent` | `true` / `true` |

---

## Assinatura

**HOME-08 Frente 3 homologação: PASS com ressalvas** (checkout pago / Brick E2E parciais).  
Storefront promo TDI1006 PDP→carrinho **comprovado**; massa smoke limpa; lista restaurada `inactive`.

**Assinatura:** MARCHA HOME-08 storefront+fixes · 12/11/2026.
