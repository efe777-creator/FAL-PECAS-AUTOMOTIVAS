# Runbook — Qualidade do mestre veicular (DQ)

**Projeto:** `wtbpwuiayednvlhvuhbh` (dev)  
**Data:** 2026-11-21  
**Invariante:** Corolla ≠ Corolla Cross (linhas OEM distintas). Busca/normalize/remap nunca colapsam filho→pai.

## Artefatos

| Artefato | Caminho |
|----------|---------|
| Baseline congelado | `docs/dados/FAL_BASELINE_MESTRE_VEICULAR_2026-11-21.json` |
| Registro canônico CSV | `docs/dados/FAL_REGISTRO_CANONICO_MODELOS_2026-11-21.csv` |
| Schema qualidade | `fal-pecas/supabase/migrations/20261122120000_models_quality_provenance.sql` |
| Remap | `fal-pecas/supabase/migrations/20261122121000_vehicle_master_quality_remap.sql` |
| Apps-import review | `fal-pecas/supabase/migrations/20261122122000_apps_import_models_review_only.sql` |

## Política rápida

- `verified` exige A1 OEM ou duas A2 concordantes.
- Fonte B (fipeX) / placa / LLM **nunca** promove sozinha.
- Seletor público: `status=active AND quality_status=verified`.
- Novos modelos (upsert/apps-import/CRUD) nascem `review`.
- Writer único: `normalizeVehicleMasterInput` → `upsert_vehicle_canonical` (fail closed, sem insert client).

## Mapa de writers (real)

| Writer | Caminho | Normaliza? |
|--------|---------|------------|
| Import CSV mestre | `adminVehicleMasterImportService` → `vehicleCanonicalUpsert` | sim |
| Sync intelligence | `vehicleMasterIntelligence` → `vehicleCanonicalUpsert` | sim |
| Confirm placa | Edge `vehicle-confirm-upsert` → RPC | sim (Edge mirror) |
| Admin CRUD modelo | `adminVehicleService.adminUpsertModel` | sim |
| Apps-import PVC | RPC `apply_catalog_applications_import` | cria modelo só como `review` |
| Seeds/migrations | SQL direto | ops; não é runtime loja |

## Operação — fila no hub

Admin → Integrações · Veículos: chips `verified` / `review` / `quarantined` / `superseded` + fila com `review_note`.

## Remap seguro

1. Contar VV/PVC/customer dos IDs origem/destino.
2. Dry-run (relatório) antes do apply.
3. Aplicar migration remap; verificar `vv_orphan=0` e canônicos Toyota/Honda/Nissan.

## Gates nota 9

Ver `docs/dados/FAL_GATE_QUALIDADE_MESTRE_9_2026-11-21.md`. Não declarar 9 se qualquer gate falhar.
