# VAL — MARCHA · Filtros logísticos peso/dims (admin produtos)

**Data:** 2026-11-06  
**Auth:** eFe — `MARCHA`  
**Residual de:** [P1-LOG-HIST](./FAL_MARCHA_LOG_HIST_MEDIDAS_VAL_2026-11-05.md) / alterações globais

---

## Escopo

Filtro server-side na listagem `/admin/produtos`: Sem peso · Sem dimensões · Sem peso ou dimensões (null ou ≤ 0).

---

## Critérios

| # | Critério | Resultado |
|---|----------|-----------|
| 1 | `adminMeasureGapOrFilter` + `adminListProducts.measureGap` | **PASS** |
| 2 | UI select Medidas + Limpar | **PASS** |
| 3 | vitest + `tsc --noEmit` | **PASS** |

---

## Artefatos

- `fal-pecas/src/services/admin/adminProductService.ts`
- `fal-pecas/src/services/admin/adminMeasureGapFilter.test.ts`
- `fal-pecas/src/pages/admin/products/AdminProductsPage.tsx`

---

## STOP

Residual filtros medidas **fechado**.  
Próximo sequencial: gates humanos (Netlify créditos / D-FRETE C / ME etiqueta / ligar pagamento) · M10 cartão (adiar) · deploy espelho eFe.

**Assinatura:** VAL filtro medidas admin PASS 2026-11-06.
