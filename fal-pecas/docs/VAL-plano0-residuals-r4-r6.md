# VAL — Residuals PLANO 0 (R4 / R5 / R6)

**Data:** 2026-11-18 · **Branch:** `dev`

## R4 — Confirmação manual e mestre

**Decisão vigente (status quo, sem mudar produto):** edição na tela de confirmação **não** chama `upsert_vehicle_canonical`.  
Só a Edge `plate-lookup` (service_role) ou import admin grava mestre.  
Se eFe quiser re-upsert na confirmação, precisa autorização explícita (RPC autenticado/staff).

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

## R6 — Migration history (inventário, sem repair)

Aplicações recentes no projeto FAL (`wtbpwuiayednvlhvuhbh`) via MCP `apply_migration` usam timestamps do servidor, enquanto o repo tem nomes `20261118…` locais. Exemplos:

| Remoto (schema_migrations) | Arquivo no repo |
|----------------------------|-----------------|
| `20261118035514_customer_vehicles_plate_normalized` | `20261118120000_customer_vehicles_plate_normalized.sql` |
| `20261118040113_g3_garage_personalization` | `20261118130000_g3_garage_personalization.sql` |
| `20261118040934/35` G6 | `20261118140000` / `40100` G6 |
| `20261118041610_g7_…` | `20261118150000_g7_…` |
| `20261118042142_r3_…` | `20261118160000_r3_…` |

**Regra:** não rodar `migration repair` improvisado. Alinhamento formal só com ordem explícita do eFe (mapear version ↔ arquivo e registrar).
