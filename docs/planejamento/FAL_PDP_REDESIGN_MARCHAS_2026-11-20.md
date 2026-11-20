# FAL — Plano operacional das marchas de redesign da PDP

**Spec:** `FAL_PDP_REDESIGN_SPEC_CONSOLIDADA_2026-11-20.md`  
**Branch:** `dev`

| Marcha | Escopo | Aceite chave | Dedup |
|--------|--------|--------------|-------|
| **0 Docs** | Spec + este plano + VAL | Docs versionados | Matriz no spec |
| **1 Estrutura** | 1440 PDP-only, 45/55→**55/45**, sticky base, 4:3 shell, thumbs ordem | Proporções; outras rotas 1240 | — |
| **2 Galeria** | Hover zoom, lightbox polish | Contain; a11y | — |
| **3 Buy-box** | Compactar, pag consolidado, CTAs, copiar link, 1 âncora | Fluxos compra | Pag + âncora |
| **4 Compat** | Form local, sheet, selo cinza equiv | Chip intacto; antiregress | Veredito único |
| **5 Frete** | Casca “Calcular frete” CEP+Consultar | Cotação + handoff | Um frete |
| **6 Acordeões** | 4 seções sob galeria | Sem eco veredito | Catálogo/apps |
| **7 Buy-box ref** | Badge, Add→Comprar, Favoritar+WA, barra | Espelha onBuyNow | Não duplica Add |
| **8 Acabamento** | Thumbs amarelas, dark:, Inter/radius | Checklist + antiregress | Gate final |
| **9 Mobile order** | `order-1/2/3` + grid lg sob galeria | Galeria→buy-box→acordeões | — |
| **10 Proporções** | Grid densificado, galeria cheia | Fit visual | — |
| **11 Ref. visual** | Alinhamento meticuloso à referência | Light/dark tokens | — |
| **12 Densidade** | Buy-box acima da dobra ≥900px; VAL responsivo | CTAs fold; 35 antiregress | — |
| **13 Alinhamento** | Ordem disponível+qty→frete; SPEC 55/45; QA dark/thumbs | Docs + dobra | — |
| **14 Medidas+AR** | Contratos densidade/tokens/CTAs; microcorte 768h | Antiregress + VAL medidas | — |

Por marcha: implementar → refine → VAL → commit `dev`.
