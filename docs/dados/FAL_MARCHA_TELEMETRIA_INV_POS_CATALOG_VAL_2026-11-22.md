# VAL — Telemetria INV pós-catálogo

**Branch:** `dev` · **Projeto:** `wtbpwuiayednvlhvuhbh` · **Sem MAIN**

## Correção

1. `resolveVehicleAgainstCatalog` devolve `catalogVersionTotal` (VV active do modelo).
2. `plate-lookup` grava `vehicle_resolution_events` **depois** do resolve, com `catalog_total` + `vehicle_version_id` (sem placa completa).

## Pós

- Vitest antiregress: **17/17**
- Deploy Edge `plate-lookup` no wtbp: **ok** (`b458016`)
