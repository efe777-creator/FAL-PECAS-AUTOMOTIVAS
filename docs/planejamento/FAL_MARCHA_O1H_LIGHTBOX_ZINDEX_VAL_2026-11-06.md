# VAL — O1-H residual: lightbox acima da bottom nav

**Data:** 2026-11-06  
**Auth:** MARCHA sequencial  
**Item:** `ProductImageLightbox` em `z-[100]` ficava sob `MobileNav` (`z-[150]`)

## Entrega

| Peça | Mudança |
|------|---------|
| `ProductImageLightbox` | `z-[100]` → `z-[280]` (acima de MobileNav 150, Modal 200, MobileDrawer 260; abaixo de Toast 300) |

Padding `main` + safe-area do nav permanece intencional (folga do conteúdo × chrome da barra), sem dobra extra no PDP.

## Critérios

- [x] Hierarquia z: lightbox cobre a bottom nav no mobile

## Gate humano

Nenhum nesta fatia.
