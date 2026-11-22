# VAL — Fechamento do mestre veicular

**Data:** 2026-11-21  
**Branch:** `dev`  
**Projeto:** `wtbpwuiayednvlhvuhbh`  
**Sem MAIN / sem deploy de produção do app**

## Escopo fechado

Defesa em profundidade + workflow staff de qualidade. **Não** enriquecer catálogo (sem thin-seed Cross, sem inventar motores para VV vazias).

## Entregas

1. **RLS** `models_public_read` / `vehicle_versions_public_read` → só `active+verified` (migration `20261122170000`, aplicada no wtbp).
2. **Árvore app:** VV com `models!inner` + `quality_status=verified` em `vehicleService`.
3. **Plate resolver:** só modelo `verified`; `superseded` remapeia via `canonical_model_id`.
4. **RPC** `set_model_quality_status` + hub (Verificar A1 / Quarentena) + badge no cadastro admin + deep link `?model=`.
5. **Import CSV** clássico: `mergeModelProductionYears` após upsert.
6. **Runbook** atualizado (exceção CRUD admin; RPC recebe nome já normalizado).

## Contagens wtbp (pós-fechamento higiene)

| Métrica | Valor |
|--------|------:|
| verified active | 126 |
| review | 0 |
| quarantined | 5 |
| shell0 (Corolla Cross) | 1 |
| VV com engine | 87 |
| VV sem engine | 242 |
| engine-em-version residual | 0 |
| verified sem vida | 0 |

## Gates 1–11

Mantém PASS conforme [`FAL_GATE_QUALIDADE_MESTRE_9_2026-11-21.md`](./FAL_GATE_QUALIDADE_MESTRE_9_2026-11-21.md), reforçados por RLS + resolver + RPC.

## Residuais honestos (fora do fechamento)

- Riqueza ~6–6,5: Cross 0 VV; 242 configs sem motor.
- Gate 12 (snapshots SENATRAN/PBEV datados): ops.
- Edge `plate-lookup` redeployado no wtbp com `vehicleResolver` verified-only.

## Critério de pronto

- [x] Loja não lê modelo/VV não-verified via RLS anon  
- [x] Árvore app filtra VV pelo pai verified  
- [x] Plate resolver verified-only (+ canonical)  
- [x] Staff promove com evidência via RPC/hub  
- [x] Módulo mestre **fechado em higiene**; riqueza explícita residual  
