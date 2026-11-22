# FAL — Residuals pós-fundação PLANO 0 (placa / garagem)

**Data:** 2026-11-18  
**Origem:** [FAL_PLANO0_FUNDACAO_CADASTRO_PLACA_2026-11-17.md](./FAL_PLANO0_FUNDACAO_CADASTRO_PLACA_2026-11-17.md)  
**Status:** residuals R1–R7 **tratados** na `dev` (R4 status quo · R5 unit · R6 inventário) — ver [VAL-plano0-residuals-r4-r6.md](../../fal-pecas/docs/VAL-plano0-residuals-r4-r6.md)  
**Branch de referência:** `dev`  
**Consumidor:** [FAL_PLANO1…](./FAL_PLANO1_MINHA_GARAGEM_FUNDACAO_EXPERIENCIA_2026-11-18.md) absorveu **R1** e **R7** (G1). **R2** tratado após G8 (política VV incomplete / ano obrigatório no upsert).

---

## Escopo

Itens conscientes deixados de fora do fechamento da fundação PLANO 0. UX completa = PLANO 1 (não misturar com P2 / visão 3D).

---

## Residuals

| ID | Residual | Por quê ficou de fora | Direção sugerida |
|----|----------|----------------------|------------------|
| R1 | `updateSavedVehicle` progressivo | ~~aberto~~ → **feito G1** | `updateSavedVehicle` + UI completar |
| R2 | Política Edge VV `incomplete` no mestre | ~~aberto~~ → **feito pós-G8** | `allowCanonicalUpsert` exige maker+model+ano; `vehicleCanonicalUpsert` rejeita sem ano; cache plate-lookup não re-upserta sem ano |
| R3 | `source_snapshot` jsonb (API completa) | ~~aberto~~ → **feito pós-G8** | Coluna `customer_vehicles.source_snapshot`; Edge `sourceSnapshot`; UI fuel/câmbio informativos; sem filtro PVC |
| R4 | Confirmação e writer mestre | ~~status quo antigo~~ → **superseded 2026-11-21** | Lookup **RO**; writer = `vehicle-confirm-upsert` pós-humano + import/sync. Ver [mapa](../arquitetura/FAL_MAPA_VEICULO_CAMINHOS_RELACOES_2026-11-21.md) |
| R5 | Suite §12 e2e restante | ~~parcial~~ → **unit §12 R5** | `plano0Section12.r5.test.ts` + matriz no VAL; e2e Playwright (#6/#11/#13) ainda pendente |
| R6 | Histórico `supabase db push` divergente | ~~parcial~~ → **inventariado** | Drift version↔arquivo listado no VAL; **sem repair** até ordem eFe |
| R7 | Dedup garagem por placa | ~~aberto~~ → **feito G1** | unique parcial `plate_normalized` + merge no save |

---

## O que NÃO é residual (já decidido)

- PVC **não** é criado no save da garagem / placa.
- Etapa 7 UX Minha Garagem = [FAL_GARAGE_VISAO_FUNCIONAL.md](../futuro/FAL_GARAGE_VISAO_FUNCIONAL.md) — plano separado.
- Higiene em massa de opções legadas (ex. fabricante `CHEV` no mestre) = ops/dados, não fundação.

---

## Ordem sugerida (quando retomar)

1. ~~R1–R7~~ tratados (R4 status quo; R5 unit; R6 inventário)  
2. Pendências leves: e2e Playwright (#6/#11/#13) · repair history R6 só com ordem eFe  
3. Autoridade writers/caminhos: [mapa veículo](../arquitetura/FAL_MAPA_VEICULO_CAMINHOS_RELACOES_2026-11-21.md)  

