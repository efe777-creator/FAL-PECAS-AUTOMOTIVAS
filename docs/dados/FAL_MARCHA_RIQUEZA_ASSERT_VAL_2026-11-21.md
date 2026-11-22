# VAL — Marcha riqueza + assertividade (2026-11-21)

**Branch:** `dev` · **Projeto:** wtbp · **Sem deploy**

## Análise (sem otimismo)

| Dimensão | Antes da marcha | Gap |
|----------|-----------------|-----|
| Higiene nominal | Corolla ≠ Cross ok | — |
| Riqueza | Cross 0 VV; Toyota fino | cascas |
| Seletor anos | `end null` colapsava no `start` | bug assertivo |
| Vida prioritária | null em Corolla/Cross/Hilux/HR-V/Sentra | seletor pobre |

## Correções aplicadas

1. **Bug `yearsFromProductionLife`:** `production_year_end = null` (em linha) passa a expandir até o ano corrente — não colapsa no start.
2. **Vida OEM A1** (migration `20261122140000`): Corolla 1993–, Cross 2021–, Hilux 2005–, HR-V 2015–, Sentra 2007–.
3. **Corolla 2023 Hybrid:** engine `1.8` na VV já existente (OEM Hybrid) — sem VV inventada.
4. **Hub:** chip `Cascas (0 VV)` via `verifiedThinShells`.
5. **Sem thin-seed** de VV/PVC no Corolla Cross (proibido pelo plano de qualidade).

## VAL

- vitest `productionLifeYears` + vehicles/plates/search alvo
- SQL: vidas preenchidas; Cross ainda 0 VV (esperado); Corolla engine 1.8

## Notas pós-marcha (honestas)

- Assertividade seletor/anos: sobe (Cross agora tem anos 2021…agora via vida).
- Riqueza de config/motor: Cross continua casca até sync/import com evidência.
- PVC: inalterado (não inventar fit).
