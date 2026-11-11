# VAL — Busca + API placa + IA (MARCHA)

**Data:** 2026-11-11  
**Auth:** eFe — `MARCHA CONTINUE, GARANTIR BUSCA, API PLACA E VAMOS JA VER A IA`  
**Deploy front:** `6af49b16` (tip `6a4e098`) · Edges: `plate-lookup` + `interpret-search-nl` redeploy

## Busca

| Caso | Evidência | Resultado |
|------|-----------|-----------|
| Vitest search+plates | 46/46 PASS | **PASS** |
| RPC HB20 2015 | 3 SKUs BRD2109,TDI2116,TDI2117 | **PASS** |
| RPC PVI1032 | 1 SKU | **PASS** |
| RPC pivo + Palio 2010 | PVI1032 | **PASS** |

## API placa

| Caso | Evidência | Resultado |
|------|-----------|-----------|
| Secret `PLATE_PROVIDER` | forçado `apiplacas` | **PASS** |
| Cache mock legado | purge + ignore mock no Edge | **PASS** |
| FRW0E37 | `source=apiplacas` Hyundai HB20 2019 1.0 | **PASS** |
| ABC1D23 (após purge) | `source=apiplacas` isMock=false | **PASS** |

## IA

| Item | Status |
|------|--------|
| Edge `interpret-search-nl` com Groq | **Deployada** |
| Sem `GROQ_API_KEY` | `mode=deterministic_required` · intent=null · fallback OK |
| Front `VITE_SEARCH_NL_LLM` | **ainda off** no Netlify (liga após key) |

### Ligar IA (ops)

```bash
npx supabase secrets set "GROQ_API_KEY=gsk_…" --project-ref wtbpwuiayednvlhvuhbh --yes
# Netlify: VITE_SEARCH_NL_LLM=1 + rebuild
```

## Assinatura

Busca + placa apiplacas OK · IA pronta aguardando GROQ_API_KEY · 2026-11-11
