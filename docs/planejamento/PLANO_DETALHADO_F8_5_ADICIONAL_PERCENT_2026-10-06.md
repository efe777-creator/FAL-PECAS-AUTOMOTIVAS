# Plano detalhado F8.5 — Adicional de custo % (Opção A)

**Data:** 2026-10-06  
**Contrato:** Opção A — `list_extra_cost` R$ da lista **fora**; `%` + `item.extra_cost` **dentro**.

## Entregas código (esta branch)

1. Prepared `20261006160000_…` ampliada: coluna + overload + callers `recalculate_price_list_items` / `set_price_list_item_pricing` com 3º arg `price_list_id`.
2. TS: `adminListPriceListItems` e `previewSellFromCost` usam `listExtraCostPercent` (R$ lista = 0).
3. **Não** altera `resolve_product_price(s)`.
4. **Não** executa `db push` nesta rodada — apply exige comando humano explícito após smoke.

## Aceite pós-apply

- Salvar % → recalc → item `calculated` muda; `manual`/`imported` estáveis.
- UI sem aviso “aguarda migration”.
- Checkout smoke 1 SKU.
