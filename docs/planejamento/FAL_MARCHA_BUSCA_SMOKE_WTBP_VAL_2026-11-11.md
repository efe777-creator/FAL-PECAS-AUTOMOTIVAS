# VAL — MARCHA busca inteligente · smoke wtbp (prod)

**Data:** 2026-11-11  
**Auth:** eFe — `MARCHA`  
**Projeto Supabase prod (Netlify):** `wtbpwuiayednvlhvuhbh`  
**Nota:** MCP `owllmfcpbodqmoerdfxx` ≠ prod do site. CLI linked = wtbp.

## Correções desta MARCHA

| Item | Status |
|------|--------|
| RPC year-range + wildcard + commercial_ref em **wtbp** (`20261110160000`) | PASS |
| Hotfix: migration compat removia `customer_can_see_product` (inexistente no wtbp) | PASS |
| Front: `searchCatalog` não reenvia `q` bruto após interpretar veículo | SHIP |
| Front: `listVehicleCatalogEntries` sem filtro nested `manufacturers.status` | SHIP |

## Smoke

| Caso | Esperado | Resultado |
|------|----------|-----------|
| SQL YMM HYUNDAI/HB20/2015 | BRD2109, TDI2116, TDI2117 (3) | **PASS** |
| Site seletor `?maker=HYUNDAI&model=HB20&year=2015` | 3 produtos + preços | **PASS** |
| Site texto `?q=HB20%202015` | mesmos 3 (após deploy front) | pendente redeploy |

## Assinatura

MARCHA smoke wtbp · 2026-11-11
