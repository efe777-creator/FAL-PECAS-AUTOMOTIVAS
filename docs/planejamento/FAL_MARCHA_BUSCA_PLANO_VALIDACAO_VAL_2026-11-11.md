# VAL — Teste e validação do plano (matriz T01–T16)

**Data:** 2026-11-11  
**Auth:** eFe — `MARCHA TESTE E VALIDAÇÃO DO PLANO , CORREÇÕES`  
**Deploy validação:** `6af498a2` (tip `d02ba15`) + tip correção T05 a publicar

## Vitest

**27+ PASS** (parser/params/expand/year) · após T05: **12 PASS** nos arquivos search re-rodados.

## SQL wtbp

| # | Caso | Resultado |
|---|------|-----------|
| T02 | HB20 2015 | **PASS** 3 (BRD+TDI*) |
| T03 | + engine 1.0 | **PASS** 3 (PVC tem 1.0) |
| T06 | terminal + YMM | **PASS** 2 TDI |
| T07 | pivo | **PASS** 13 |
| T08 | pivo Palio 2010 | **PASS** PVI1032 |
| T09 | TDI2116 | **PASS** |
| T10 | PVI1032 | **PASS** |
| Prep | synonym on | **PASS** |
| Monitor | `search_zero_results` | **PASS** tabela existe |

## Site (pós `6af498a2`)

| # | Caso | Resultado |
|---|------|-----------|
| T02 | `?q=HB20 2015` | **PASS** (sessões anteriores + deploy) |
| T06/ponteira | | **PASS** 2 TDI |
| T10 | `Nakata PVI1032` | **PASS** 1× PVI1032 · label `1997–atual` |
| T05 | `HB20 One 2015` | **FALHOU** → URL `version=One` + 3 SKUs (wildcard null) |
| T16 | IA off | **PASS** (flag off; busca OK) |

## Correção T05 (esta MARCHA)

- Cadastro HB20 só tem versão **Unique** (não One).
- Parser agora: versão só se existir no catálogo do modelo; senão `needsClarification=version` **sem** poluir URL.
- `listVehicleCatalogEntries` carrega `versions[]` de `vehicle_versions`.

## Pendente (não bloqueia P0)

- T14/T15 smoke E2E placa com token API
- UI de clarificação de versão (hoje só não aplica filtro errado)
- Admin listar `search_zero_results`
- Ligar LLM (`VITE_SEARCH_NL_LLM=1` + provider)

## Assinatura

Validação plano · correção T05 · 2026-11-11
