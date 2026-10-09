# MARCHA PDP-D — VAL Relacionados por categoria (P3)

**Data:** 2026-10-09  
**Autorização:** MARCHA (eFe)  
**Runtime:** `wtbpwuiayednvlhvuhbh` · UI `http://localhost:5173`  
**Pré-condição:** [PDP-C VAL](./FAL_MARCHA_PDP_C_VAL_2026-10-09.md) · [Auditoria ML](./FAL_AUDITORIA_PDP_COMPARATIVA_ML_2026-10-09.md) P3  
**Fora de escopo:** frete, MP, reviews, vídeo, “quem viu” aleatório, FIND-004, migrations, commit git

---

## Veredicto

| Campo | Valor |
|-------|-------|
| MARCHA PDP-D | **OK** |
| Regra | Mesma `categorySlug` · exclui atual · prefere disponíveis · limit 4 |
| Sem categoria / falha fetch | Bloco **oculto** (não inventa) |
| UI | Grade `ProductCard` + “Ver mais no catálogo” |
| Frete / MP / reviews | **Não** introduzidos |

---

## Arquivos

| Arquivo | Mudança |
|---------|---------|
| `fal-pecas/src/services/products/relatedProducts.ts` | `pickRelatedProducts` |
| `fal-pecas/src/services/products/relatedProducts.test.ts` | exclusão / preferência / vazio |
| `fal-pecas/src/services/products/productService.ts` | `listRelatedProductsForPdp` |
| `fal-pecas/src/lib/productLabels.ts` | labels relacionados |
| `fal-pecas/src/pages/Product/ProductPage.tsx` | seção após ajuda |

---

## Vitest (FATO)

```text
vitest.CMD run relatedProducts / productLabels / productDescription / productImages / CompatibilityAppsBlock
Test Files  5 passed (5)
Tests       24 passed (24)
```

---

## Smoke browser (FATO) — BRD2109

| Check | Resultado |
|-------|-----------|
| “Produtos relacionados” | Presente |
| Cards | 4 itens (8 âncoras = card×2 links) |
| Inclui produto atual | **Não** |
| Ver mais no catálogo | `/catalogo?cat=axial-de-direcao` |
| Filtrar no catálogo (C) | Intactos |

---

## Limitações / próximo

- Vídeo na galeria → só com asset real  
- Frete / MP / reviews → paralelos bloqueados  
- Commit/push PDP-A…D → gate git (`COMMIT`)

## STOP

MARCHA PDP-D **VALIDADA**. Aguardar `COMMIT` (ou paralelo frete/MP com auth própria).
