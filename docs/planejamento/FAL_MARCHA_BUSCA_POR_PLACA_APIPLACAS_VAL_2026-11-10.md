# VAL — MARCHA Busca por placa · API Placas (adapter real)

**Data:** 2026-11-10  
**Auth:** eFe — `VAMOS ADD A API DO BUSCAR PLACA JA`  
**AJUSTE:** **028** Evolução 3 (adapter)  
**Base:** [Evo1 VAL](./FAL_MARCHA_BUSCA_POR_PLACA_EVO1_VAL_2026-11-10.md)

---

## Veredito

| Item | Estado |
|------|--------|
| Endpoint real `/basico/{placa}` (`wdapi2.com.br/v3`) | **OK** |
| Secrets + deploy Edge `plate-lookup` | **OK** |
| Migration `cached_plates` (SQL direto) | **OK** |
| Smoke placa inválida | **PASS** (`source=apiplacas`) |
| Smoke placa real `INT8C36` | **PASS** — `found` · Volkswagen Crossfox 2007 · IDs FAL |
| Cache `cached_plates` | **PASS** (hit com mesmo `queriedAt`) |
| Alias VW→Volkswagen + conferência `not_in_catalog` | **OK** |

---

## Smoke real (após saldo R$ 50)

| Placa | Resultado |
|-------|-----------|
| `INT8C36` | `found` · Volkswagen · Crossfox · 2007 · `manufacturerId`+`modelId` |
| Cache 2ª chamada | mesmo `queriedAt` (sem nova cobrança) |

Ajustes feitos na rodada: alias montadoras, Title Case, log 402, `not_in_catalog` abre conferência com dados, migration cache.

**Assinatura:** API Placas live + smoke INT8C36 PASS · 2026-11-10.
