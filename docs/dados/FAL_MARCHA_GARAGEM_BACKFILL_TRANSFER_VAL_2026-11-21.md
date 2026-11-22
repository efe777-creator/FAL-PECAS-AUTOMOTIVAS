# VAL — Backfill FK garagem + transfer sanitize

**Branch:** `dev` · **Projeto:** wtbp · **Sem MAIN**

## Correções

1. `sanitize_garage_vehicle_fks` + backfill `vehicle_identities` / `customer_vehicles` (HR-V EX Cvt superseded → HR-V canônico).
2. `transfer_vehicle_ownership_base` e `accept_vehicle_transfer` sanitizam FKs ao clonar membership.
3. `updateSavedVehicle` chama `assertVerifiedGarageFks` quando toca em FKs.

## Pós

- `vi_bad` / `cv_bad` = **0**
- Vitest antiregress + g1: 20/20
