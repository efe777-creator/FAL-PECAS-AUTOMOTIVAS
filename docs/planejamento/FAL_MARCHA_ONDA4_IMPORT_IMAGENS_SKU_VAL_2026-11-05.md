# VAL — MARCHA Onda 4 · Import imagens por SKU (17)

**Data:** 2026-11-05  
**Auth:** eFe — `MARCHA`

---

## Escopo

1. Import em lote: nome do arquivo = SKU FAL ou código referência (`BRD5605.jpg`, `BRD5605_2.png` = foto extra).  
2. Prévia + barra de progresso no envio.  
3. Opção “pular se já tem imagem”.  
4. Upload múltiplo também no form do produto.

---

## Critérios

| # | Critério | Resultado |
|---|----------|-----------|
| 1 | Rota `/admin/produtos/importar-imagens` | **PASS** |
| 2 | Match SKU + `commercial_ref` (case-insensitive via mapa) | **PASS** |
| 3 | Progresso done/total + tabela ok/skip/error | **PASS** |
| 4 | Link em Produtos + Importações | **PASS** |
| 5 | Form produto: `multiple` + link para lote | **PASS** |
| 6 | Unit `skuFromImageFilename` | **PASS** (5/5) |
| 7 | `tsc --noEmit` | **PASS** |

---

## Artefatos

- `fal-pecas/src/lib/skuFromImageFilename.ts` (+ test)
- `fal-pecas/src/services/admin/adminImageSkuImportService.ts`
- `fal-pecas/src/pages/admin/products/AdminImageSkuImportPage.tsx`
- Wire: `router.tsx`, `AdminProductsPage`, `AdminImportsPage`, `AdminProductFormPage`

---

## STOP

Próximo Onda 4: prep IA busca (22) · relacionados curados (26) · ou gates humanos (D-FRETE / ME / ligar pagamento).

**Assinatura:** VAL Onda 4 import imagens SKU PASS 2026-11-05.
