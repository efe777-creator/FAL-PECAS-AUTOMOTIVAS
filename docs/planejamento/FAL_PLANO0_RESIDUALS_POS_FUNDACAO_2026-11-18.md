# FAL — Residuals pós-fundação PLANO 0 (placa / garagem)

**Data:** 2026-11-18  
**Origem:** [FAL_PLANO0_FUNDACAO_CADASTRO_PLACA_2026-11-17.md](./FAL_PLANO0_FUNDACAO_CADASTRO_PLACA_2026-11-17.md)  
**Status:** backlog pós-fundação — PLANO 1 (G0–G8) **fechado** na `dev`; residuals abertos abaixo  
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
| R3 | `source_snapshot` jsonb (API completa) | Hoje só `engineRaw`/`versionRaw` + colunas texto na garagem | Coluna snapshot (ou blob) no cache/placa e/ou garagem; fuel/câmbio opcionais na UI, sem virar filtro PVC |
| R4 | Confirmação manual não re-upserta mestre | Só Edge na consulta (ou import admin) grava mestre | Decidir se edição na confirmação deve chamar upsert autenticado/staff — fora da fundação |
| R5 | Suite §12 e2e restante | Unit + smokes manuais cobrem o crítico; faltam #5–7/#11–13/#16–18 automatizados | Expandir Vitest/Playwright quando houver harness estável |
| R6 | Histórico `supabase db push` divergente | Migration progressive aplicada via `db query` | Alinhar migration history com ordem explícita do eFe — sem `repair` improvisado |
| R7 | Dedup garagem por placa | ~~aberto~~ → **feito G1** | unique parcial `plate_normalized` + merge no save |

---

## O que NÃO é residual (já decidido)

- PVC **não** é criado no save da garagem / placa.
- Etapa 7 UX Minha Garagem = [FAL_GARAGE_VISAO_FUNCIONAL.md](../futuro/FAL_GARAGE_VISAO_FUNCIONAL.md) — plano separado.
- Higiene em massa de opções legadas (ex. fabricante `CHEV` no mestre) = ops/dados, não fundação.

---

## Ordem sugerida (quando retomar)

1. ~~R1 / R7 / R2~~ **feitos**  
2. **R3** `source_snapshot` jsonb (API completa)  
3. **R4** confirmação manual re-upsert mestre (decisão produto)  
4. **R5** / **R6** conforme capacidade de QA/ops  
