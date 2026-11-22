# VAL — Análise minuciosa vida × assertividade (2026-11-21)

## Achados (pré-correção)

| Achado | Medida |
|--------|--------|
| Integridade dura (órfão/dup/polluted) | 0 |
| Cascas 0 VV | 1 (Corolla Cross — sem thin-seed) |
| Vida pontual start=end | **62** |
| Vida × VV inconsistente | Strada, Compass, Parati, Passat |
| Point-life ≥2015 (falso descontinuado) | Virtus, T-Cross, Argo, Compass, … |

Efeito: seletor pobre + `plateIdentityAssert` rebaixava ano válido (ex. Compass 2025 com pye=2017).

## Correções

1. Migration `20261122150000_align_model_life_from_vv`:
   - `start = min(start, min VV)`
   - se `max VV > end`: end null se ymax≥2024, senão ymax
   - point-life ≥2015 → `end null` (em linha)
2. `plateIdentityAssert`: end null → teto soft `now+1`; mensagem “em linha”
3. Hub: chips cascas + vida pontual residual

## Pós-apply (wtbp)

- life×VV mismatch: **0**
- point_life ≥2015: **0**
- point_life residual (&lt;2015): ~45 (snapshots históricos — ok)
- open_life (end null): ~45
- Cross: ainda 0 VV (esperado)

## Sem inventar

Nenhuma VV/PVC nova. Só alinhamento de metadado de vida a evidência VV + regra em linha.
