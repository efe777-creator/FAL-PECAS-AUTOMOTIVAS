# VAL — Fechamento inteligência veicular FAL

**Data:** 2026-11-22  
**Branch:** `dev` · **HEAD alvo:** pós-`d03908d`  
**Projeto:** `wtbpwuiayednvlhvuhbh`  
**Sem MAIN / sem deploy de produção do app**

## Escopo fechado (inteligência operacional)

Camada que **decide, defende e observa** o mestre veicular — sem enriquecer catálogo inventando VV/PVC/motor/faixa.

Complementa o fechamento de higiene [`FAL_MARCHA_FECHAMENTO_MESTRE_VEICULAR_VAL_2026-11-21.md`](./FAL_MARCHA_FECHAMENTO_MESTRE_VEICULAR_VAL_2026-11-21.md).

## Pilares entregues

| Pilar | O quê | Evidência |
|-------|--------|-----------|
| Higiene + garagem | RLS verified; sanitize DEFINER; reject VV casca; QQ→Chery | migrations `20261122*` + VALs higiene |
| Hub staff | Cascas · vida pontual · VV sem motor · lookups `catalog_total=0` | `AdminVehicleIntegrationsHubPage` + stats |
| Placa / assert | FKs estáveis; casca 0 VV avisa e zera `versionId`; dual year | `plateIdentityAssert` |
| Telemetria INV | Eventos **após** resolve com `catalog_total` + `version_id` | `plate-lookup` wtbp |
| Gate 12 contrato | senatran/pbev exigem checksum; fipeX = B | `vehicleEvidence` |
| Fonte B | Sync intelligence / fipeX **não** promove verified | hub chip + writers |

## Commits desta onda (dev)

`14c7616` vida pontual → `e0a98a2` sem motor → `8867e16` Gate12 → `b458016` telemetria → `d4d8355` hub catálogo 0 → `d03908d` assert casca (+ VALs).

## Fora do fechamento (explícito)

| Residual | Por quê |
|----------|---------|
| Corolla Cross 0 VV | Sem thin-seed / sem inventar config |
| ~242 VV sem `engine` | Exige evidência externa; hub só lista |
| Download SENATRAN/PBEV datado | Ops humano (Gate 12 PASS parcial) |
| Mineração Cross/fuel via API | Adiado — API paga depois |
| MAIN / Netlify produção app | Autorização expressa |

## Critério de pronto — inteligência

- [x] Staff vê ricos residuais sem poder “completar” inventando no hub  
- [x] Lookup RO + telemetria com sinal de casca (`catalog_total`)  
- [x] Assert cliente honesto em casca  
- [x] Evidence A2 formal exige checksum  
- [x] Antiregress cobre hub + evidence + placa + writers  
- [x] Runbook aponta operação e Gate 12 ops  

**Status:** inteligência veicular **fechada em operação** em `dev`. Riqueza de catálogo permanece residual consciente.
