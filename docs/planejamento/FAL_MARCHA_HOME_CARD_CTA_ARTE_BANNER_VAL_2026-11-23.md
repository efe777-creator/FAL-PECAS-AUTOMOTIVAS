# VAL — Residual Notes #7 CTAs + #18 arte banner

**Branch:** `dev` · **Sem MAIN**  
**Data:** 2026-11-23

## Escopo

1. ProductCard mobile: par desktop não vaza (wrappers Notes #7).  
2. Upload campanha: dimensão **exata** 1376×768 (desktop) / 768×432 (mobile).  
3. Home frame: **`w-full` + altura limitada** (`h-[min(38vh,220px)]` …) — **não** `aspect`+`max-h` (encolhia ~645px no desktop).

## Fora

Button/`twMerge` global · ProductMediaFrame · destino composto · `main`/deploy · URL manual.

## Evidência

| Gate | Resultado |
|------|-----------|
| `compatUiAntiregress` (21 tests, incl. Card Notes #7 CTAs) | **PASS** |
| `adminHomeBannerImage.test` (4 tests) | **PASS** |
| `tsc --noEmit` | **PASS** |

## Smoke visual/funcional (`localhost:5173` · 2026-11-23)

| Checagem | Resultado |
|----------|-----------|
| Mobile 390: 2 CTAs (Adicionar + link Comprar); desktop par `display:none` | **PASS** |
| Mobile: Adicionar → badge carrinho `1` + “No carrinho: 1” | **PASS** |
| Desktop 1280: CTAs Comprar + Adicionar (ordem #7) | **PASS** |
| Desktop banner full-bleed (antes ~645px; depois ~1265/`w-full`) | **PASS** (após fix altura) |
| Banner CTA → `/catalogo?cat=suspensao` | **PASS** |
| Placa no 1º viewport (mobile) | **PASS** |
| Admin upload UI (sessão) | **SKIP** — coberto por vitest dimensões |
| Produção `falpecasautomotivas.com` | **FAIL esperado** — build antigo (sem deploy) |

## Arquivos

- `ProductCard.tsx`
- `compatUiAntiregress.test.ts`
- `adminHomeContentService.ts` (+test)
- `AdminHomeContentPage.tsx`
- `HomeBannerCarousel.tsx` (aspect+max-h)
- REF Notes #7 / #18
