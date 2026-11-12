# VAL — MARCHA versão / modelo / infos veículo

**Data:** 2026-11-12  
**Auth:** eFe — `MARCHA GARANTIR QUE VERSAO MODELO E INFORMAÇÕES DO VEICULO ESTEJAM CERTAS`  
**Projeto:** wtbp · Edge `plate-lookup` redeployada

## Código

- `normalizeVersionLabel` — EXPRESSION→Expression, INTENS→Intense, etc.
- Peel `CROSSER S` → modelo `XTZ150` + versão `Crosser S`
- Ano em faixa `AAAA/AAAA` → **ano-modelo** (último AAAA)
- Enrich cache + mapper API aplicam versão canônica
- Upsert client devolve `version_name` já existente no VV

## Vitest

**57 PASS** — `src/services/plates` + `src/services/search`

## Placas (frio, mascaradas) — PLATE_FAILS=0

| Máscara | Maker / Model / Year / Engine / Version |
|---------|-----------------------------------------|
| BB****29 | Renault / Kwid / **2018** / 1.0 / **Intense** |
| FR****37 | Hyundai / HB20 / 2019 / 1.0 / Unique |
| AY****45 | Renault / Clio / **2015** / 1.0 / **Expression** |
| IN****36 | Volkswagen / Cross Fox / 2007 / 1.6 / — |
| CR****44 | Ford / Ka / 1999 / 1.0 / — |
| QW****23 | Yamaha / **XTZ150** / 2020 / — / **Crosser S** |

Nota: anos 2018/2015 refletem preferência ano-modelo quando a API manda faixa fab/modelo (antes usava só o 1º AAAA).

## Dados

- VV `EXPRESSION` → `Expression` (2 rows)
- Sem residual `Intens` / `UNIQUE` upper solto nas versões alvo

## Assinatura

MARCHA veículo canônico · Edge deploy · 57 vitest · 2026-11-12
