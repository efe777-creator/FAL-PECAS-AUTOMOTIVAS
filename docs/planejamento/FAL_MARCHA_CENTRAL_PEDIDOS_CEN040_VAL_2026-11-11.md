# VAL — CP-CEN-040 (filas server-side)

**Data:** 2026-11-11  
**Auth:** eFe — MARCHA P0-3  
**Código:** `adminListOrders` + Area / View / Lista / Hub

## Critério

Área/Visão/Lista não filtram client-side sobre os 200 pedidos mais recentes do universo.  
Query usa `status in (…)`, `cancellation_request`, ou predicado `problems`; paginação estável.

## Mudança

| Superfície | Antes | Depois |
|------------|-------|--------|
| `adminListOrders` | só `eq(status)` | `statuses[]` · `cancellationRequest` · `problems` · paginação |
| AreaPage | fetch all → filter area | fetch `statuses` da área/aba |
| ViewPage | fetch all → filter view | fetch filtro da visão (cancel pending / statuses / problems) |
| Lista avançada | grupo client | grupo → `statuses` server |
| Hub atenção | top 200 recentes | `ATTENTION_STATUSES` server (+ recentes limit 6 à parte) |

## Testes

| # | Caso | Resultado |
|---|------|-----------|
| 1 | Unit precedência filtros | **PASS** 4 |
| 2 | Unit áreas/views | **PASS** 4 |
| 3 | Lint páginas/service | **PASS** |
| 4 | Smoke browser staff | **PENDENTE eFe** |

## Veredito

**CP-CEN-040 = CORRIGIDO** (código). Smoke UI staff pendente (não bloqueia fechamento P0 documental).

## P0 completo

FRE-022 PASS · SEC-030 CORRIGIDO · CEN-040 CORRIGIDO → **Gate 1 elegível** após smoke staff opcional / checklist Fase 1.
