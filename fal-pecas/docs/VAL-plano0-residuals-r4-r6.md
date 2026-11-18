# VAL — Residuals PLANO 0 (R4 / R5 / R6)

**Data:** 2026-11-18 · **Branch:** `dev`

## R4 — Confirmação manual e mestre (**atualizado** 2026-11-18)

**Decisão vigente:** após confirmação humana, se o usuário está **autenticado** e há maker+model+**ano**, e faltam IDs (ou o ano divergiu do lookup), a Edge `vehicle-confirm-upsert` (JWT obrigatório) chama `vehicleCanonicalUpsert` com guards R2.  
Anônimo continua só com o upsert do `plate-lookup` (quando aplicável). Cliente **não** chama RPC service_role direto.

## R5 — Suite §12

| # | Caso | Unit Vitest | e2e / smoke |
|---|------|-------------|-------------|
| 1–4 | Placa completa / parcial | `plano0Section12.r5.test.ts` | VAL placa |
| 5 | API down → manual | unit (`unavailable`) | manual |
| 6 | Cadastro manual conta | — | Playwright `e2e/r5-06-…` (skip sem `E2E_USER_*`) |
| 7 | Ambíguo | mock `AMB1G00` | — |
| 8–9 | Save parcial / sem VV | G1 + progressive tests | — |
| 10 | Listagem incompletos | `isVehicleIncomplete` | UI conta |
| 11 | Edição incompletos | G1 `updateSavedVehicle` | Playwright `e2e/r5-11-…` (skip sem `E2E_USER_*`) |
| 12 | Pending pós-login | flush + pending + snapshot | smoke VAL 2026-11-18 |
| 13 | Múltiplos veículos | — | Playwright `e2e/r5-13-…` (skip sem `E2E_USER_*`) |
| 14–15 | Integridade / sanitize | split + §12 | — |
| 16 | PVC não no save; fuel≠filtro | §12 `#16` | — |
| 17 | RLS | policies CV / CVPE | integração manual |
| 18 | Regressão busca | VAL placa + pipeline | — |

**Harness:** `npm test -- src/services/plates/plano0Section12.r5.test.ts`  
**E2E:** `npm run test:e2e` (requer `E2E_USER_EMAIL` / `E2E_USER_PASSWORD`; sem credenciais os specs #6/#11/#13 fazem skip documentado)

## R6 — Migration history (**reparado** 2026-11-18)

Pacote B3: [FAL_R6_MIGRATION_REPAIR_2026-11-18.md](../../docs/planejamento/FAL_R6_MIGRATION_REPAIR_2026-11-18.md).

Ledger local marcado `applied` (sem reexecutar SQL): `20261118010000`, `120000`, `130000`, `140000`, `140100`, `150000`, `160000`. Entradas MCP antigas preservadas.

| Remoto (schema_migrations MCP) | Arquivo no repo (também no ledger) |
|----------------------------|-----------------|
| `20261118035514_customer_vehicles_plate_normalized` | `20261118120000_…` |
| `20261118040113_g3_garage_personalization` | `20261118130000_…` |
| `20261118040934/35` G6 | `20261118140000` / `40100` |
| `20261118041610_g7_…` | `20261118150000_…` |
| `20261118042142_r3_…` | `20261118160000_…` |
| *(schema já tinha progressive; ledger local preenchido)* | `20261118010000_…` |

**Evidência:** `SELECT version FROM supabase_migrations.schema_migrations WHERE version LIKE '20261118%'` inclui pares MCP + locais.
