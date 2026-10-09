# FAL-IMP-08 / VAL-08 — Preços + DIV-002

**Data:** 2026-10-09  
**Gate:** Onda 1  
**Escopo:** custo base único (SQL) + Liberar usa `resolve_product_price`  
**Runtime:** `wtbpwuiayednvlhvuhbh`

---

## 1. Auditado

| Item | Antes |
|------|--------|
| SQL `product_base_cost` | Só `products.supplier_id` + `supplier_products.cost` |
| TS `resolveBaseCost` | Principal → fallback **FAL-SUP-01** (preview ≠ apply) |
| Stats / materialize lista | Contavam custo só com supplier_id (sem FAL) |
| Liberar | Heurística: override / default / qualquer lista active / espelho `products.price` |
| Loja / pedido | Já usavam `resolve_product_price(s)` no runtime |
| Dados | 100 produtos; 99 com custo SQL; 1 sem custo (SK971, sem FAL) |

**DIV-002 (decidido):** unificar na SQL central (incl. fallback FAL); remover duplicidade do TS.

---

## 2. Causas

Preview admin e recalc SQL seguiam regras diferentes de custo (FIND-010). Liberar não chamava a resolução oficial (FIND-006 parcial).

---

## 3. Alterado

| Camada | Mudança |
|--------|---------|
| DB | [`20261009130000_product_base_cost_fal_fallback.sql`](../../fal-pecas/supabase/migrations/20261009130000_product_base_cost_fal_fallback.sql) — `product_base_cost` + lote `product_base_costs` (principal → FAL-SUP-01) — **aplicada no runtime via `db query --linked`** |
| `adminPriceListService` | Preview/stats/materialize/virtuais leem custo via RPC `product_base_costs` |
| `resolveBaseCost` | Mantido só como espelho puro para unit test |
| `adminReleaseProductToStore` | Gate de preço = `resolveProductPrice` (RPC oficial) |

**Política oficial:**

```text
Custo base     = product_base_cost(product)
                 1) supplier_id do produto
                 2) fallback FAL-SUP-01 (active)
Preço loja     = resolve_product_price (override → lista pública → default)
Liberar        = published + preço resolvido > 0 + is_available
Formação lista = custo SQL → regra lista → price_list_items (RPCs existentes)
```

---

## 4. Não alterado

| Item | Motivo |
|------|--------|
| Carrinho UX (`products.price` / snapshot) | Verdade no `place_order` (resolve); espelho UX permanece documentado |
| Checklist completo D-LIBERAR / massa | **IMP-10** |
| DIV-001 B (item com/sem preço UI) | **IMP-09** |
| Fórmulas TS `pricingFormulas` | Espelho controlado das fórmulas SQL (já alinhadas) |
| `migration repair` / `db push` completo | Higiene P2 paralela |
| Registro em `schema_migrations` | Apply via query (mesmo padrão IMP-03); repair separado |

---

## 5. VAL-08

| Teste | Resultado |
|-------|-----------|
| Vitest `resolveBaseCost` + `pricingFormulas` + `computeCostTotal` | **14 passed** |
| SQL: def `product_base_cost` contém fallback FAL-SUP-01 | **OK** |
| SQL: `product_base_costs(all)` → 99 com custo | **OK** |
| SQL: rpc ≡ `coalesce(principal, fal)` em 100 produtos | **OK** |

---

## 6. Status

| | |
|--|--|
| FAL-IMP-08 | **Concluído** (DIV-002 + alinhamento Liberar→resolve) |
| FAL-VAL-08 | **PASS** |
| FIND-010 / DIV-002 | **Fechados** nesta marcha |
| FIND-006 | **Parcial** — Liberar alinhado; carrinho UX espelho → backlog fino / IMP-10 |

**Próximo bloco:** `FAL-IMP-09` (listas + DIV-001 B).
