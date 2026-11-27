# Runbook — Qualidade do mestre veicular (DQ)

**Projeto:** `wtbpwuiayednvlhvuhbh` (dev)  
**Data:** 2026-11-22 (fechamento inteligência operacional)  
**Invariante:** Corolla ≠ Corolla Cross (linhas OEM distintas). Busca/normalize/remap nunca colapsam filho→pai.  
**Fechamento:** higiene `FAL_MARCHA_FECHAMENTO_MESTRE_VEICULAR_VAL_2026-11-21.md` · inteligência `FAL_MARCHA_FECHAMENTO_INTELIGENCIA_VEICULAR_VAL_2026-11-22.md`.

## Artefatos

| Artefato | Caminho |
|----------|---------|
| Baseline congelado | `docs/dados/FAL_BASELINE_MESTRE_VEICULAR_2026-11-21.json` |
| Registro canônico CSV | `docs/dados/FAL_REGISTRO_CANONICO_MODELOS_2026-11-21.csv` |
| Schema qualidade | `fal-pecas/supabase/migrations/20261122120000_models_quality_provenance.sql` |
| Remap | `fal-pecas/supabase/migrations/20261122121000_vehicle_master_quality_remap.sql` |
| Apps-import review | `fal-pecas/supabase/migrations/20261122122000_apps_import_models_review_only.sql` |
| RLS público + RPC qualidade | `fal-pecas/supabase/migrations/20261122170000_mestre_public_rls_and_quality_rpc.sql` |
| Extração engine←version | `fal-pecas/supabase/migrations/20261122160000_extract_engine_from_version_name.sql` |
| Fuel + chave natural | `fal-pecas/supabase/migrations/20261126150000_vehicle_versions_fuel.sql` |
| Attrs técnicos VV | `fal-pecas/supabase/migrations/20261127190000_vehicle_versions_tech_attributes.sql` |
| RPC enrich tech | `fal-pecas/supabase/migrations/20261127191000_enrich_vehicle_version_tech.sql` |
| Fontes / evidência | `fal-pecas/supabase/migrations/20261127192000_vehicle_data_sources_evidence.sql` |
| Lotes import mestre | `fal-pecas/supabase/migrations/20261127193000_vehicle_import_batches.sql` |

## Política rápida

- `verified` exige A1 OEM (`oem_a1`) ou par A2 (`a2_concordant`) + URL — via RPC `set_model_quality_status`.
- Fonte B (fipeX) / placa / LLM **nunca** promove sozinha.
- Seletor público + **RLS anon**: `status=active AND quality_status=verified` (VV só com pai verified).
- Novos modelos (upsert/apps-import/CRUD) nascem `review`.
- Writer canônico: `normalizeVehicleMasterInput` → `upsert_vehicle_canonical` (fail closed, sem insert client).
- **Exceção controlada:** `adminUpsertModel` / `adminUpsertVersion` gravam direto no PostgREST (staff), sempre `review` no insert e sem promover `verified`. Promoção só pela RPC/hub.
- RPC SQL `upsert_vehicle_canonical_internal` recebe nome **já normalizado** pelo TS/Edge; não replica a matriz pai/filho.

## Mapa de writers (real)

| Writer | Caminho | Normaliza? |
|--------|---------|------------|
| Consultar / import CSV mestre | `applySelectedMasterCandidates` → `vehicleCanonicalUpsert` + `mergeModelProductionYears` | sim |
| Lote import (infra; UI apply ainda não) | `adminVehicleImportBatchService` → canônico + `enrich_vehicle_version_tech` | sim |
| Sync intelligence | `vehicleMasterIntelligence` → `vehicleCanonicalUpsert` + vida | sim |
| Confirm placa | Edge `vehicle-confirm-upsert` → RPC | sim (Edge mirror) |
| Admin CRUD modelo | `adminVehicleService.adminUpsertModel` | sim (exceção: sem RPC canônico) |
| Qualidade staff | `setModelQualityStatus` → RPC `set_model_quality_status` | n/a |
| Apps-import PVC | RPC `apply_catalog_applications_import` | cria modelo só como `review` |
| Seeds/migrations | SQL direto | ops; não é runtime loja |

## Operação — fila no hub

Admin → Integrações · Veículos: chips `verified` / `review` / `quarantined` / `superseded` + fila com ações Verificar (A1) / Quarentena + deep link `?model=` no cadastro.

Residuais de riqueza (só visibilidade staff — **sem inventar** VV/motor/faixa):

- Cascas verified (0 VV) — ex. Corolla Cross
- Vida pontual (start=end)
- VV verified sem motor
- Lookups INV `catalog_total=0` (14d; sem placa completa)

Chips operacionais: Lookup read-only · Fonte B não promove · Gate 12 checksum A2.

## Gate 12 — snapshots SENATRAN / PBEV (ops)

Contrato em código: `toVehicleEvidence` + `isGate12FormalSnapshot` (`fal-pecas/src/services/vehicles/vehicleEvidence.ts`).

Checklist ops (não automatizado nesta marcha):

1. Baixar dump datado (SENATRAN e/ou PBEV) e guardar fora do repo se licença restringir.
2. Calcular checksum (ex. `sha256:<hex>`) do arquivo baixado.
3. Registrar evidência com `sourceId` `senatran`/`pbev`, `sourceUrl` (origem oficial), `fetchedAt` ISO e `checksum`.
4. Adaptador **somente leitura** — não escreve `models` / VV / PVC; promoção continua via RPC A1/A2.
5. Fonte B (fipeX) **não** conta como Gate 12 formal.

## Remap seguro

1. Contar VV/PVC/customer dos IDs origem/destino.
2. Dry-run (relatório) antes do apply.
3. Aplicar migration remap; verificar `vv_orphan=0` e canônicos Toyota/Honda/Nissan.

## Gates nota 9

Ver `docs/dados/FAL_GATE_QUALIDADE_MESTRE_9_2026-11-21.md`. Não declarar 9 se qualquer gate falhar.
