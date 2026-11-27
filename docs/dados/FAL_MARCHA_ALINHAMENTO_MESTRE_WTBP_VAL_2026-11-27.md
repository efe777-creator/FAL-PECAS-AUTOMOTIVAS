# VAL — Alinhamento mestre wtbp (runtime + pendências)

**Projeto:** `wtbpwuiayednvlhvuhbh`  
**Data:** 2026-11-27  
**Escopo:** fechar desalinho schema/histórico/Edge/docs pós-cadastro mestre. **Não** `db push` massivo. **Não** HF.

## Gate SQL (PASS)

| Check | Valor |
|-------|-------|
| Colunas tech VV | 6 |
| CHECKs `vehicle_versions_*_chk` | 6 |
| Tabelas fontes/lote | 6 |
| Seeds `vehicle_data_sources` | 4 |
| RPC `enrich_vehicle_version_tech` | true |
| PVC | 732 |
| VV ativas | 488 |
| `schema_migrations` mestre (fuel+4) | 5 |

## Runtime

| Item | Estado |
|------|--------|
| Edge `vehicle-confirm-upsert` | ACTIVE **v14** (guards placa/cache) |
| Writer massa telas | `applySelectedMasterCandidates` (consultar + import) |
| Writer morto | `adminApplyVehicleMasterImport` ausente |
| Hub | fontes + incompletude wired |
| Histórico migrations | `20261126150000` registrado (efeito já existia) |

## Docs / copy alinhados nesta marcha

- Mapa §3.2 enrich · §3.3 Adaptive CRUD · §5 enrich · §10 no-push + snapshot drift  
- Plano híbrido: Adaptive CRUD = **DONE**  
- Runbook: artefatos 2615/2719* + writers reais (`applySelected…`; lote = infra)  
- `TECH_COLUMNS_PENDING`: copy de fallback, sem afirmar “ainda não no wtbp”

## +2 VV (inventário, sem delete)

Audi Q3 2026 · `admin` · `Performance 4x4` / `Performance Black 4x4` (2026-11-26).

## Residuais (backlog — não desta marcha)

| Residual | Nota |
|----------|------|
| Ligar UI ao `adminApplyVehicleImportBatch` | Serviço existe; telas ficam no writer único atual até ordem |
| Guia: painéis fonte/evidência/histórico/PVC rico | Hub já cobre fontes/histórico parcial |
| Preencher attrs tech em massa | 488 ativas ainda NULL em transmission/traction/body/fuel |
| Drift local↔remote (~129 / ~141) | Só apply arquivo a arquivo; sem repair cego |
| Adaptive no hub Integrações · API paga · 2A/VIN · fipeX dump · VAL ApiPlacas | Plano híbrido backlog |

## Critério de pronto — atingido

Schema mestre validado · histórico fuel+tech · Edge v14 · docs coerentes · sem `db push` · PVC 732.
