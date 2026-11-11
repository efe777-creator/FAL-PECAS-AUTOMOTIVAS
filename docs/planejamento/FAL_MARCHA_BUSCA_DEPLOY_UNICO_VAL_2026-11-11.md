# VAL — Deploy único busca + IA

**Data:** 2026-11-11  
**Auth:** eFe — `MARCHA PUSH E DPLOYS`  
**Tip:** `cff94c6` · Netlify prod (LLM on) · Edges NL + plate redeployed

## Feito

| Item | Status |
|------|--------|
| Push `main` | sync |
| `VITE_SEARCH_NL_LLM=1` production | OK |
| Deploy Netlify (flag + stopwords NL) | tip `cff94c6` |
| Edge `interpret-search-nl` | OK |
| Edge `plate-lookup` | OK |
| Fix stopwords NL → `p_q` limpo | `cff94c6` |

## Smoke

| Caso | Resultado |
|------|-----------|
| Site `?q=HB20 2015` → maker/model/year · 3 SKUs · `12/...` | **PASS** |
| Site NL pivô Palio → `q=pivo&maker=Fiat&model=Palio&year=2010` · **PVI1032** | **PASS** |
| Edge NL · mode=groq | **PASS** |
| Placa FRW0E37 · apiplacas HB20 2019 | **PASS** |
| Env `VITE_SEARCH_NL_LLM` = 1 | **PASS** |

## Assinatura

Deploy + hotfix NL stopwords · 2026-11-11
