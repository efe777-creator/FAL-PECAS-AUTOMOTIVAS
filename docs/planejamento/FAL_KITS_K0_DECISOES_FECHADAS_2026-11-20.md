# FAL Kits — K0 decisões fechadas

**Data:** 2026-11-20  
**Branch:** `dev`  
**Autorização:** marcha — cruzar docs + implantação assertiva  
**Base:** [`AUDITORIA_INTEGRAL_KITS_ITENS_PROMOCOES_FAL.md`](./AUDITORIA_INTEGRAL_KITS_ITENS_PROMOCOES_FAL.md)

## Gap-check (resumo)

| Critério “prédio único” | No relatório | Status |
|-------------------------|--------------|--------|
| Pilares F6B/F6/F7/F8/Adaptive protegidos | §1, §23 | OK |
| Fronteiras kit/compat/estoque/preço/promo/pedido | §§8–19 | OK |
| Matriz de impacto | §23 | OK |
| Evidência tripla | §2 + Apêndice C | OK |
| Alternativa A (kit ∈ products + BOM) | §8, §24 | OK — **adotada** |
| Sem implementação com BLOQUEADOR aberto | §27–§29 | **Resolvido por este K0** |

## Decisões H1–H11 (fechadas)

| ID | Decisão |
|----|---------|
| H1 | `products.product_kind` ∈ (`item`, `kit`); default `item`. Categoria comercial = árvore na criação. |
| H2 | Composição válida para publicar: ≥ 2 linhas **ou** 1 linha com `quantity` ≥ 2. |
| H3 | Parcial vs completo = SKUs separados. |
| H4 | Preço auto materializado na lista Base do kit; leitura só via `resolve_product_price`. |
| H5 | Uma lista pública exclusiva para preços manuais de kits na v1. |
| H6 | Mudança de PVC em componente → alerta + bloqueio de republicação do kit até revisão. |
| H7 | Dimensões/peso próprios do SKU kit. |
| H8 | Admin: ficha de produto + seção composição; filtro por kind. |
| H9 | Promo via `product_promotions` no `product_id` do kit; sem herança dos componentes. |
| H10 | H12 reconciliado: PVC próprio do kit + componentes disponíveis; sem herança A∧B. |
| H11 | Snapshot da composição = `jsonb` em `order_items` (fase K4). |

## Spec curta de implantação

1. **K1** — kind + BOM + events + admin composição + “usado em kits” no item → **FEITO**  
2. **K2** — `kit_price_mode` auto/manual + lista `preco-kits-manual` + sync Base / provisório → **FEITO**  
3. **K3** — disponibilidade agregada + expansão place_order/fulfill/release → **FEITO**  
4. **K4** — snapshot jsonb + OrderOps checklist → **FEITO**  
5. **K5–K6** — PVC kit + promo gate → **FEITO**  
6. **K7** — loja: selo Kit + composição/economia na PDP → **FEITO**  
7. **K8** — substituição assistida transacional → **FEITO**  
8. **K9** — admin polish (filtro kind, promo kits, OrderOps snapshot, shell único) → **FEITO**  
9. **K12** — PDP item: seção “Kits com esta peça” (query invertida) → **FEITO**  
10. **K10** — import composição em massa (`kit_composition`) → **FEITO**  
11. **K11** — kits/itens em listas assigned + vínculo cliente → **FEITO**  
12. **K13** — devolução/reposição física pós-envio (snapshot) → **FEITO**  

**Roadmap kits (auditoria):** K0–K13 concluídos na `dev`.  
**Loja residual:** filtro catálogo `?kind=kit|item` via `search_products.p_product_kind` (2026-11-20).  

**Não fazer:** segundo catálogo, segundo resolve, inventory do kit, herança de promo/compat.

## Artefatos K1–K4

- Migrations: `20261120220000_*`, `20261120221000_*`, `20261120223000_*`  
- Services: `adminProductKitService.ts`, `adminKitPricingService.ts`  
- UI: composição/uso em kits; OrderOps mostra snapshot de separação  
- SQL: `assert_sale_stock` / `reserve_sale_stock` / `build_kit_composition_snapshot`  
- K5: `kit_compat_review_required` + trigger PVC → flag kits; gate no Liberar  
- K6: promo no `product_id` do kit (badge Kit); sem herança de componentes  
- K7: `kitCompositionStoreService`, `PdpKitCompositionBlock`, selo no card/PDP  
- K8: RPC `admin_replace_component_in_kits` + `AdminProductKitReplacePanel` (ficha do item)  
- K9: filtro kind em produtos; Home › Promoções › Kits; OrderOps lê snapshot; sem painel Kits Ops paralelo  
- K12: `listPublishedKitsIncludingComponent` + seção PDP `KITS_COM_ESTA_PECA_SECTION_LABEL`  
- K10: RPC `apply_kit_composition_import` + `/admin/produtos/importar-kits` (sync BOM por kit_sku)  
- K11: `customers.assigned_price_list_id` + resolve (override→assigned→public) + UI Clientes/Preços  
- K13: RPC `restock_order_item_physical` + OrderOps “Repor estoque” (kits via snapshot)
