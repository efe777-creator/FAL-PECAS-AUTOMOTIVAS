# VAL — Create RPC sanitize canônico + trigger FK

**Branch:** `dev` · **Projeto:** wtbp · **Sem MAIN**

## Correções

1. `create_customer_vehicle_with_identity` passa FKs por `sanitize_garage_vehicle_fks` (mesmo canônico do backfill/transfer).
2. Triggers `BEFORE UPDATE` em `customer_vehicles` / `vehicle_identities` re-sanitizam FKs sujos.
3. `addSavedVehicle` chama `assertVerifiedGarageFks` no client antes do RPC.
4. Copy conta: 3 níveis (versão / só modelo / sem vínculo) — sem `version_id` cru.

## Pós

- `create_uses_sanitize` = **true** (wtbp)
- Triggers: `customer_vehicles_sanitize_fks`, `vehicle_identities_sanitize_fks`
- Vitest e1 + antiregress: **18/18**
