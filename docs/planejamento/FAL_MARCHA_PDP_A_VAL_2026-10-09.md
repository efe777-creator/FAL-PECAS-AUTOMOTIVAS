# MARCHA PDP-A — VAL Completude de dados na loja

**Data:** 2026-10-09  
**Autorização:** MARCHA (eFe)  
**Runtime:** `wtbpwuiayednvlhvuhbh` · UI `http://localhost:5173`  
**Pré-condição:** [Auditoria PDP](./FAL_AUDITORIA_PDP_COMPLETA_PROPOSTA_2026-10-09.md)  
**Fora de escopo:** PDP-B (galeria thumbs/layout), frete, MP, FIND-004, migrations

---

## Veredicto

| Campo | Valor |
|-------|-------|
| MARCHA PDP-A | **OK** |
| `product_images` → `imageUrl` | **OK** (wire; placeholder se sem foto) |
| Descrição / Especificações / Ajuda | **OK** (só se houver dados) |
| Carrinho `Referência:` | **OK** |
| Schema / PVC / FIND-004 | **Não tocados** |

---

## Arquivos

| Arquivo | Mudança |
|---------|---------|
| `fal-pecas/src/services/products/productImages.ts` | `attachPrimaryProductImages` + `pickPrimaryStoragePath` |
| `fal-pecas/src/services/products/productImages.test.ts` | Primária / sort_order / vazio |
| `fal-pecas/src/services/products/productService.ts` | Anexa imagens em list + getById |
| `fal-pecas/src/services/search/searchService.ts` | Anexa imagens no catálogo |
| `fal-pecas/src/lib/productSpecs.ts` | `buildProductSpecRows` |
| `fal-pecas/src/lib/productSpecs.test.ts` | attrs/vazios |
| `fal-pecas/src/lib/productLabels.ts` | labels Descrição / Specs / Ajuda |
| `fal-pecas/src/pages/Product/ProductPage.tsx` | seções PDP-A |
| `fal-pecas/src/pages/Cart/CartPage.tsx` | `Referência:` + thumb se `imageUrl` |
| `fal-pecas/src/contexts/CartContext.tsx` | persiste `commercialRef` |
| `fal-pecas/src/types/index.ts` | `CartItem.commercialRef` |

---

## Vitest (FATO)

```text
vitest run productImages / productSpecs / productLabels / vehicleAppYear / CompatibilityAppsBlock
Test Files  5 passed (5)
Tests       21 passed (21)
```

---

## Smoke browser (FATO)

| Check | Resultado |
|-------|-----------|
| PDP BRD2109 | `Referência:` · **Especificações** · **Ajuda** · Aplicação com YY |
| Anos / apps | Intactos (regressão MARCHA UI) |
| Descrição | Bloco presente quando cadastro tem texto (BRD2109: sim no smoke) |
| Imagem | Placeholder se sem `product_images` (não inventa foto) |

---

## Limitações / próximo

- Galeria multi-imagem / thumbs / sticky buy → **MARCHA PDP-B**  
- Frete / MP → paralelos  
- Volume real de fotos no wtbp pode ser baixo — wire pronto para quando houver Storage

## STOP

MARCHA PDP-A **VALIDADA**. Aguardar auth para PDP-B ou commit/push.
