# MARCHA PDP-B — VAL Galeria + buy-box

**Data:** 2026-10-09  
**Autorização:** MARCHA (eFe)  
**Runtime:** `wtbpwuiayednvlhvuhbh` · UI `http://localhost:5173`  
**Pré-condição:** [Auditoria PDP × ML](./FAL_AUDITORIA_PDP_COMPARATIVA_ML_2026-10-09.md) · PDP-A local  
**Fora de escopo:** frete, parcelas, reviews, relacionados, FIND-004, migrations, commit git

---

## Veredicto

| Campo | Valor |
|-------|-------|
| MARCHA PDP-B | **OK** |
| B1 `images[]` + `ProductGallery` | **OK** (N=0 placeholder; N=1 sem thumbs; N>1 thumbs) |
| B2 Buy-box / CTA alto | **OK** (CTA antes de apps/desc/specs) |
| B3 Placeholder sem emoji | **OK** (`ProductImagePlaceholder` · “Sem foto”) |
| B4 Proporção / overflow-x | **OK** (`object-contain` · `overflow-x-hidden` · smoke sem scroll H) |
| Schema / PVC / FIND-004 | **Não tocados** |

---

## Arquivos

| Arquivo | Mudança |
|---------|---------|
| `fal-pecas/src/types/index.ts` | `Product.images?: string[]` |
| `fal-pecas/src/services/products/productImages.ts` | `sortProductImagePaths` · `attachProductImageGallery` |
| `fal-pecas/src/services/products/productImages.test.ts` | ordenação galeria + regressão primária |
| `fal-pecas/src/services/products/productService.ts` | `getProductById` → galeria completa |
| `fal-pecas/src/components/product/ProductGallery.tsx` | thumbs / principal / placeholder |
| `fal-pecas/src/components/product/ProductImagePlaceholder.tsx` | SVG neutro (sem 🧩) |
| `fal-pecas/src/pages/Product/ProductPage.tsx` | layout galeria \| buy-box → apps → desc → specs → ajuda |

---

## Vitest (FATO)

```text
vitest.CMD run productImages / productSpecs / productLabels / CompatibilityAppsBlock
Test Files  4 passed (4)
Tests       17 passed (17)
```

---

## Smoke browser (FATO)

| Check | Resultado |
|-------|-----------|
| PDP BRD2109 (`91636c92-…`) | CTA **antes** de Aplicação / Descrição / Especificações |
| Placeholder | “Sem foto” · **sem** emoji 🧩 na PDP |
| Thumbs N=0 | Chrome de miniaturas **ausente** |
| Anos YY | Intactos (`12/...` etc.) |
| Overflow horizontal | **não** |
| Frete / parcelas / reviews | **não** introduzidos |

> Volume real de fotos no wtbp pode ser baixo — wire de `images[]` pronto para Storage multi-imagem.

---

## Limitações / próximo

- Polish tabela specs / “ver descrição completa” → P2  
- Relacionados com regra → P3  
- Frete / MP → paralelos  
- Commit/push PDP-A+B → gate git separado (`COMMIT PDP-A` / feat→dev→main)

## STOP

MARCHA PDP-B **VALIDADA**. Aguardar auth para commit/push ou MARCHA P2.
