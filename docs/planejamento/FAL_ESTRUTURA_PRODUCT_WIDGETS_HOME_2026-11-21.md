# FAL — Estrutura · Widgets de produtos (Home)

**Data:** 2026-11-21 · **Branch:** `dev`  
**Status:** Estrutura + **bestsellers ready** (RPC `store_bestseller_product_ids`)

## Objetivo

Registry único para trilhos de produto (destaques, ofertas, **mais vendidos**, novidades, campanha), alinhado a Notes #13/#18 — implementar um kind por vez sem reinventar a Home.

## Código

| Peça | Path |
|------|------|
| Registry / copy / ordem | `fal-pecas/src/lib/productWidgets.ts` |
| Loader | `fal-pecas/src/services/home/productWidgetLoader.ts` |
| Bestsellers | `bestsellerService.ts` + migration `20261121210000_store_bestseller_product_ids.sql` |
| Testes | `productWidgets.test.ts` · `bestsellerService.test.ts` |

## Kinds

| Kind | Status | Fonte hoje |
|------|--------|------------|
| `featured` | ready | `listFeaturedProducts` + curadoria home |
| `offers` | ready | `listPromoHighlightProducts` |
| `bestsellers` | **ready** | RPC `store_bestseller_product_ids` + `bestsellerService` · Home rail (sem duplicar destaques/ofertas) |
| `new_arrivals` | planned | stub — data de publicação / estoque |
| `campaign` | planned | stub trilho; CTA banner Notes #18 já filtra via `href` (`homeCampaignLink`) |

## Ops

Aplicar no Supabase (wtbp): `20261121210000_store_bestseller_product_ids.sql`. Sem a RPC a Home simplesmente omite o trilho (lista vazia).

## Próximas marchas (quando pedir)

1. **new_arrivals** / **campaign** — fontes reais.  
2. Home 100% via `listReadyProductWidgets()`.  
3. Admin: toggles por kind em `store_home_settings` (opcional).

Sem `main`/prod sem OK.
