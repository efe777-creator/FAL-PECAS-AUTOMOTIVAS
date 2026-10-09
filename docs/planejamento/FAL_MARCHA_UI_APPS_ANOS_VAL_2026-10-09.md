# MARCHA UI — VAL Mais aplicações + formatação dos anos

**Data:** 2026-10-09  
**Autorização:** MARCHA UI (eFe)  
**Runtime:** `wtbpwuiayednvlhvuhbh` · UI `http://localhost:5173`  
**Trilho FIND-004 dados:** ENCERRADO (M1–M5) — **não reaberto**

---

## Veredicto

| Campo | Valor |
|-------|-------|
| MARCHA UI | **OK** |
| Anos `YY/YY` · `YY/...` · Sem ano inicial | **OK** (formatter + smoke) |
| Truncate silencioso na carga | **Removido** (limiar só na UI) |
| Expand card 4 / PDP 8 | **OK** (smoke) |
| Schema / apply / PVC | **Não tocados** |

---

## Decisões (fixas desta marcha)

| Tema | Regra |
|------|--------|
| Contagem do limiar | Linhas `CompatibilityAppLine`, ordem dos grupos |
| Card | Até **4** linhas; `totalLines > 4` → Mais/Menos aplicações |
| PDP | Até **8** linhas; mesmo controle |
| Carga | `maxMakers` / `maxLinesPerMaker` default `null` (sem corte) |
| Anos | Só `formatVehicleAppYear` — PVC int intacto; `yearMatchesVehicleApp` inalterado |
| Só fim | `YEAR_NO_START_LABEL = 'Sem ano inicial'` (não inventar start) |
| `EX` | não usar |

---

## Arquivos

| Arquivo | Mudança |
|---------|---------|
| `fal-pecas/src/lib/vehicleAppYear.ts` | `toYy`, `YY/YY`, `YY/...`, `YEAR_NO_START_LABEL` |
| `fal-pecas/src/lib/vehicleAppYear.test.ts` | Casos obrigatórios |
| `fal-pecas/src/lib/productLabels.ts` | `MAIS_APLICACOES_LABEL` / `MENOS_APLICACOES_LABEL` |
| `fal-pecas/src/services/products/compatibilitySummary.ts` | Defaults unbounded; slice só se limite finito |
| `fal-pecas/src/services/products/productService.ts` | Catálogo + PDP: `maxMakers/maxLinesPerMaker: null` |
| `fal-pecas/src/services/search/searchService.ts` | Idem |
| `fal-pecas/src/components/product/CompatibilityAppsBlock.tsx` | `variant` card/pdp, expand, `aria-expanded`, `sliceCompatibilityGroups` |
| `fal-pecas/src/components/product/CompatibilityAppsBlock.test.ts` | Limiares 4/8 |
| `fal-pecas/src/components/product/ProductCard.tsx` | `variant="card"` |
| `fal-pecas/src/pages/Product/ProductPage.tsx` | `variant="pdp"` |

**Não editados:** ROADMAP / BACKLOG / STATUS / molde mestres; migrations; apply/import FIND-004.

---

## Vitest (FATO)

```text
.\node_modules\.bin\vitest.CMD run \
  src/lib/vehicleAppYear.test.ts \
  src/lib/productLabels.test.ts \
  src/services/products/compatibilitySummary.test.ts \
  src/components/product/CompatibilityAppsBlock.test.ts

Test Files  4 passed (4)
Tests       18 passed (18)
```

---

## Smoke browser (FATO)

| Check | Resultado |
|-------|-----------|
| `/catalogo` anos | `97/...`, `98/...`, `03/22`, `11/20` — sem `1997+` |
| Card BRD9329 | 4 linhas + **Mais aplicações**; expand → **8** · `aria-expanded=true` · **Menos aplicações** |
| Card SK4898 | 4 → expand **30** linhas (prova fim do truncate na carga) |
| PDP `1307B` | 8 linhas YY; botão ausente (total ≤ 8) — correto |
| PDP SK4898 | 8 linhas + Mais; expand → **30** · `aria-expanded=true` · sample `03/22` |
| Identidade FAL | Referência / Ver produto / card preservados |
| stopPropagation | Botão no card não navega ao PDP (click com MouseEvent no botão) |

---

## Limitações / fora de escopo

- Reviews FIND-004 (21) + TDI0150 — trilho dados, não esta marcha.
- Sync docs mestres / molde — aguarda auth documental.
- MP smoke — paralelo humano.
- `pnpm exec vitest` falhou por symlink Windows; suite rodou via `node_modules\.bin\vitest.CMD`.

---

## STOP

MARCHA UI **VALIDADA**. Aguardar revisão. Paralelos: MP smoke; reviews/TDI0150; sync docs mestres.
