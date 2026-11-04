# VAL — MARCHA_LOGISTICA_MEDIDAS_PRODUTOS

**Data:** 2026-11-04  
**Auth:** MARCHA (pós-α · P0-MED)  
**Plano:** [FAL_PLANO_FUNCIONAL_LOGISTICA_MEDIDAS_2026-11-04.md](./FAL_PLANO_FUNCIONAL_LOGISTICA_MEDIDAS_2026-11-04.md)  
**Runtime:** `wtbpwuiayednvlhvuhbh`  
**D-FRETE:** **B** (inalterado)

---

## Escopo

Origem **Manual × Global** por campo (peso/altura/largura/comprimento) + bulk na lista de produtos com pergunta sobre manuais.  
**Fora:** histórico de medidas, filtros logísticos dedicados, padrões de categoria apply, remetente origem (P0-ORI).

---

## Entrega (FATO)

| Item | Estado |
|------|--------|
| Migration `weight_origin`…`length_origin` (`manual`\|`global`) | Arquivo local OK |
| Backfill: valor preenchido → manual; vazio → global | No SQL |
| Types + `adminUpsertProduct` / select | OK |
| Form produto: select origem; editar valor → Manual | OK |
| Bulk lista: painel + `adminApplyGlobalProductMeasures` (`skip_manual` \| `overwrite_manual` + confirm) | OK |
| `tsc --noEmit` | PASS |
| **Apply SQL no wtbp** | **OK** (`db query --remote` 2026-11-04) |

### Arquivos

- `fal-pecas/supabase/migrations/20261104120000_product_measure_origins.sql`
- `fal-pecas/src/types/index.ts` (`MeasureOrigin`)
- `fal-pecas/src/services/admin/adminProductService.ts`
- `fal-pecas/src/pages/admin/products/AdminProductFormPage.tsx`
- `fal-pecas/src/pages/admin/products/AdminProductsPage.tsx`

---

## Apply wtbp

Executado via `supabase db query --remote --yes -f …product_measure_origins.sql`.  
Colunas verificadas em `information_schema` (`weight_origin`…`length_origin`, default `global`).  
`db push` continua inviável por drift de histórico (não repair nesta frente).

---

## Aceite

- Produto com medida preenchida mostra origem Manual (ou editável).  
- Bulk “respeitar Manual” não altera campos Manual.  
- Bulk “sobrescrever” pede confirm e marca Global.  
- DDL no runtime **OK**.

---

## STOP

**P0-MED fechado (código + DDL wtbp).**  
Deploy do front desta fatia liberado quanto ao schema de medidas.

**Assinatura agente:** VAL MARCHA_LOGISTICA_MEDIDAS_PRODUTOS 2026-11-04 (+ DDL apply).
