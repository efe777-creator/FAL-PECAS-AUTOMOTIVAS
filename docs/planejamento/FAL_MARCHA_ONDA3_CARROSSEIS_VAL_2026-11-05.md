# VAL — MARCHA Onda 3 · Carrosséis Home (07/08)

**Data:** 2026-11-05  
**Auth:** eFe — `MARCHA`

---

## Escopo

- **07** `HomeBannerCarousel` — 3 slides estáticos (suspensão/freios/filtros), autoplay com `prefers-reduced-motion`, setas + dots  
- **08** `ProductCarousel` — trilho horizontal scroll-snap em Destaques, Ofertas e Suspensão/direção  

**Fora:** admin de campanhas/destaques (09/10) · condições de pagamento (11/12, gate eFe)

---

## Critérios

| # | Critério | Resultado |
|---|----------|-----------|
| 1 | Banner abaixo do hero com CTA para catálogo | **PASS** |
| 2 | Autoplay pausa em hover/foco; respeita reduced-motion | **PASS** |
| 3 | Grades de produto viram trilho com setas | **PASS** |
| 4 | Unit `carouselIndex` | **PASS** |
| 5 | `tsc --noEmit` | **PASS** |

---

## STOP

Próximo Onda 3: admin destaques/campanhas (09/10) · condições pagamento = **gate eFe**.

**Assinatura:** VAL Onda 3 carrosséis PASS 2026-11-05.
