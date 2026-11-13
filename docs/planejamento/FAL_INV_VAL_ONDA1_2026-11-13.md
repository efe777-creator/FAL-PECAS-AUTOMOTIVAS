# VAL — INV Onda 1

**Data:** 2026-11-13  
**Status:** **VALIDADO** (unit + SQL + smoke preview)  
**Edge:** `plate-lookup` redeployed (INV resolver + telemetry)  
**Schema:** `vehicle_aliases` + `vehicle_resolution_events` aplicados em wtbp  
**Higiene Argo:** `MOTOR 1.x` → engine; versões title-case (HGT corrigido)  
**Aliases:** 17 total (16 validated, 1 pending)

## Vitest

- `resolveVehicleIdentity` + plates + `invSearchParity` — **65 PASS** (9 files)

## SQL / RPC (`search_products`)

| Filtro | SKUs |
|--------|------|
| Hyundai HB20 2019 1.0 Unique | BRD2109, TDI2116, TDI2117 |
| Renault Kwid 2017 1.0 Intense | TDI0653 |
| Chevrolet Prisma 2019 1.0 Joy | 10+ (ex.: BRD0312, BRD0375, TDI0303…) |
| Fiat Argo 2020 1.0 Drive | SK1214, SK145S, TDI0151, TDI0152 |

## Smoke preview

**URL:** https://inv-onda1--fal-pecas-automotivas-efe.netlify.app

| Placa | Confirmação | Catálogo |
|-------|-------------|----------|
| FRW0E37 | Hyundai / HB20 / 2019 / 1.0 / Unique; fuel só informativo | URL correta; **3 produtos** |
| QPN8J87 | Chevrolet / Prisma / 2019 / 1.0 / **Joy** (não `Prisma 10MT Joye`) | URL correta; **12 produtos** |
| Argo manual | Fiat / Argo / 2020 / 1.0 / Drive; versões Drive·Trekking·Precision·HGT; motores 1.0/1.3/1.8 | **4 produtos** |

## Contrato

| Caso | Resultado |
|------|-----------|
| Argo Drive 1.3 | modelo/versão/motor separados |
| HL AP | `pending_validation`, versão Não informado |
| CHEV Prisma 10MT Joye | Chevrolet / Prisma / 1.0 / Joy |
| Paridade texto≈placa | mesmos params RPC |
| `""` engine/version | omitidos na URL (wildcard) |

## Feature flag

- `INV_RESOLVER_ENABLED=0` na Edge desliga INV (fallback pipeline antigo).
- Default: ligado.

## UX

- `VehiclePlateConfirmation`: `aria-live`, candidatos `aria-pressed`, copy INV.
- Catálogo: `applyVehicleFilter` só patcha YMM (preserva `q`/`cat`/`brand`/`sort`).
- Confirmação obrigatória antes do filtro; combustível fora do VehicleFilter.

## Preview / prod

| Artefato | URL / nota |
|----------|------------|
| Preview | https://inv-onda1--fal-pecas-automotivas-efe.netlify.app |
| Deploy id | `6af71f8daac3b14500494380` |
| Prod front | **bloqueado** até aval |
| Edge | wtbp `plate-lookup` (INV on) |

## Expansão (pós-gates)

Fiat → VW → Chevrolet → Ford → Renault → Toyota → Hyundai → busca textual → jornada → entidades técnicas → fontes externas.
