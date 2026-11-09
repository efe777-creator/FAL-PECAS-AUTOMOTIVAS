# Auditoria 022-E0 — Contratos de preço (readonly)

**Data:** 2026-11-09  
**Status:** Auditado — pronto para planejar Etapa 1 (fonte única / consistência)  
**AJUSTE:** 022  

---

## Fonte única existente

| Camada | Arquivo | Papel |
|--------|---------|--------|
| Resolução | `fal-pecas/src/services/pricing/priceResolutionService.ts` | `attachResolvedPrices` / `resolveProductPrices` |
| Catálogo/busca | `productService`, `searchService` | Anexam preço resolvido |
| Carrinho | `fal-pecas/src/services/cart/cartPricing.ts` | Usa `resolveProductPrices` |
| Admin display | `paymentDisplayService` | Condições comerciais (não métodos reais) |

## Achados

1. Já existe motor central de resolução — **não criar segundo**.  
2. Promo Home (`listPromoHighlightProducts`) compara `listPrice` vs `resolvedPrice`/`promoPrice` após attach.  
3. Risco residual: UI de condições (`paymentDisplay`) vs métodos reais no checkout — Etapa 5 da spec Comercial.  
4. Destaques híbridos (E2) entregues na fatia Home; E1 = garantir mesmo número em card/PDP/cart/pedido em smoke.

## Próximo (022-E1)

- Smoke manual: 1 SKU promo + 1 normal em card → PDP → cart → checkout (valores iguais).  
- Checklist admin Lista Promocional vs vitrine.  
- Não alterar schema sem finding.

**Assinatura:** 022-E0 audit PASS · 2026-11-09.
