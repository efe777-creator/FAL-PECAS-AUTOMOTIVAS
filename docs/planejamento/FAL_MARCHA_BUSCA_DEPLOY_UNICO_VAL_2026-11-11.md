# VAL — Deploy único busca + IA

**Data:** 2026-11-11  
**Auth:** eFe — `MARCHA PUSH E DPLOYS`  
**Tip:** `efcde07` · Netlify `6af4a1c2` · Edges NL + plate redeployed

## Feito

| Item | Status |
|------|--------|
| Push `main` | sync |
| `VITE_SEARCH_NL_LLM=1` production | OK |
| Deploy Netlify (com flag no bundle) | `6af4a1c2` |
| Edge `interpret-search-nl` | OK |
| Edge `plate-lookup` | OK |

## Smoke

| Caso | Resultado |
|------|-----------|
| Site `?q=HB20 2015` → URL maker/model/year · 3 SKUs · `12/...` | **PASS** |
| Edge NL pivô Palio 2010 · mode=groq | **PASS** |
| Placa FRW0E37 · apiplacas HB20 2019 | **PASS** |
| Env `VITE_SEARCH_NL_LLM` = 1 | **PASS** |

## Assinatura

Deploy único publicado · 2026-11-11
