# VAL — MARCHA Onda 4 · Relacionados curados (26)

**Data:** 2026-11-06  
**Auth:** eFe — `MARCHA`  
**Runtime:** `wtbpwuiayednvlhvuhbh`

---

## Escopo

Curadoria admin de produtos relacionados na PDP, com **fallback** pela mesma categoria (comportamento PDP-D). Sem aleatório / sem “quem viu”.

---

## Critérios

| # | Critério | Resultado |
|---|----------|-----------|
| 1 | Tabela `product_related_links` + RLS (público lê ativos; staff write) no wtbp | **PASS** |
| 2 | `mergeRelatedProducts` prioriza curados e completa com fallback | **PASS** (vitest 6) |
| 3 | PDP `listRelatedProductsForPdp` usa curadoria + categoria | **PASS** |
| 4 | Admin: seção no form de produto (add / ↑↓ / remover, máx 8) | **PASS** |
| 5 | `tsc --noEmit` | **PASS** |

---

## Artefatos

- `fal-pecas/supabase/migrations/20261106120000_product_related_links.sql`
- `fal-pecas/src/services/products/relatedProducts.ts` (+ test)
- `fal-pecas/src/services/products/relatedLinksService.ts`
- `fal-pecas/src/services/products/productService.ts`
- `fal-pecas/src/services/admin/adminProductRelatedService.ts`
- `fal-pecas/src/components/admin/AdminProductRelatedSection.tsx`
- Wire: `AdminProductFormPage.tsx`

---

## STOP

Onda 4 código do plano mestre (17 / 22 / 26) **fechada**.  
Próximo: gates humanos (créditos Netlify / D-FRETE C / ME etiqueta / ligar pagamento e expansão de sinônimos) · ou M8 estorno (política eFe).

**Assinatura:** VAL Onda 4 relacionados curados PASS 2026-11-06.
