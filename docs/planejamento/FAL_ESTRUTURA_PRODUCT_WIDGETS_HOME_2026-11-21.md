# FAL — Estrutura · Widgets de produtos (Home)

**Data:** 2026-11-21 · **Branch:** `dev`  
**Status:** Estrutura criada · kinds `planned` sem fonte de dados ainda

## Objetivo

Registry único para trilhos de produto (destaques, ofertas, **mais vendidos**, novidades, campanha), alinhado a Notes #13/#18 — implementar um kind por vez sem reinventar a Home.

## Código

| Peça | Path |
|------|------|
| Registry / copy / ordem | `fal-pecas/src/lib/productWidgets.ts` |
| Loader (ready + stubs) | `fal-pecas/src/services/home/productWidgetLoader.ts` |
| Testes | `fal-pecas/src/lib/productWidgets.test.ts` |

## Kinds

| Kind | Status | Fonte hoje |
|------|--------|------------|
| `featured` | ready | `listFeaturedProducts` + curadoria home |
| `offers` | ready | `listPromoHighlightProducts` |
| `bestsellers` | **planned** | stub `[]` — métricas de venda depois |
| `new_arrivals` | planned | stub — data de publicação / estoque |
| `campaign` | planned | stub — campanhas Notes #18 |

## Próximas marchas (quando pedir)

1. **Bestsellers:** agregação pedidos pagos → ranking → `loadProductWidgetProducts('bestsellers')`.  
2. **Home:** renderizar trilhos via `listReadyProductWidgets()` (+ feature flag para planned).  
3. **Admin:** toggles por kind em `store_home_settings` (opcional).

Sem `main`/prod sem OK.
