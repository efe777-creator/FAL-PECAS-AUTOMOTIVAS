# VAL — Onda 3: carrossel Destaques sem cortar card ao meio

**Data:** 2026-11-06  
**Auth:** MARCHA (finding eFe)  
**Item:** na Home, o último card visível do carrossel aparecia cortado na borda direita

## Entrega

| Peça | Mudança |
|------|---------|
| `ProductCarousel` | Larguras em colunas exatas 2 / 3 / 4 (`calc`); `snap-always`; setas avançam página inteira |
| `carouselPageStep` | Helper + teste do passo de scroll |

## Critérios

- [x] Em desktop, 4 cards inteiros — sem “pedaço” do 5º
- [x] Em tablet, 3 inteiros; mobile, 2
- [x] Seta › avança página alinhada ao snap
- [x] `vitest` carouselPageStep OK
- [x] `tsc -b` OK

## Gate humano

Nenhum.
