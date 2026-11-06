# VAL — Escala ideal das fotos no card (nem pequena, nem estourada)

**Data:** 2026-11-06  
**Auth:** MARCHA (finding eFe)  
**Item:** fotos nos Destaques/cards pareciam “selo” pequeno dentro do quadro

## Entrega

| Peça | Mudança |
|------|---------|
| `ProductMediaFrame` | Card: menos padding + área um pouco maior; `productMediaImgClassCard` com `scale-[1.18]` |
| `ProductCard` | Usa classe card + hover `1.22` |
| `ProductGallery` | Zoom leve `1.06` na principal (PDP) |

## Critérios

- [x] Continua `object-contain` (não corta a peça)
- [x] Card preenche melhor o quadro (compensa margem branca típica das fotos)
- [x] Não vira crop agressivo / `object-cover`
- [x] `tsc -b` OK

## Gate humano

Nenhum — validar visual no espelho eFe após deploy.
