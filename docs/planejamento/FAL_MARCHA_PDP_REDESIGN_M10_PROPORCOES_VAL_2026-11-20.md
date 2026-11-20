# VAL — Marcha 10: proporções PDP (validação browser)

**Data:** 2026-11-20 · **Branch:** `dev` · **URL:** `http://localhost:5173/produto/tdi1002`

## Diagnóstico

| Achado | Causa |
|--------|--------|
| “Não vi mudança” no site publicado | `dev` **ahead 10** de `origin/dev` — commits locais não no deploy |
| Layout esparso / “buraco” | gap 32px + padding gallery alto + frete com select sempre aberto |
| Coluna galeria “frouxa” | pad `p-4` + scale 1.06 |

## Ajustes

| Item | Antes → Depois | Status |
|------|----------------|--------|
| Grid | 45/55 gap-8 → **48/52** gap-6 | PASS (medido 48%) |
| Gallery pad / scale | p-4 / 1.06 → **p-1.5 / 1.14** | PASS |
| Buy-box padding / densidade | p-5 / space-y-3 → **p-4 / space-y-2.5** | PASS |
| Frete | select sempre aberto → CEP+Consultar; endereço em `<details>` | PASS |
| Título | 26–32 → **22–28** | PASS |
| Antiregress | 35 PASS | PASS |

**Assinatura:** MARCHA 10 proporções PDP · 2026-11-20
