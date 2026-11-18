# FAL — Residuals pós-fundação PLANO 0 (placa / garagem)

**Data:** 2026-11-18  
**Origem:** [FAL_PLANO0_FUNDACAO_CADASTRO_PLACA_2026-11-17.md](./FAL_PLANO0_FUNDACAO_CADASTRO_PLACA_2026-11-17.md)  
**Status:** backlog pós-fundação — **não** bloqueia Planejamento 1 Minha Garagem  
**Branch de referência:** `dev`  
**Consumidor:** [FAL_PLANO1_MINHA_GARAGEM_FUNDACAO_EXPERIENCIA_2026-11-18.md](./FAL_PLANO1_MINHA_GARAGEM_FUNDACAO_EXPERIENCIA_2026-11-18.md) absorve **R1** e **R7** na etapa **G1**.

---

## Escopo

Itens conscientes deixados de fora do fechamento da fundação PLANO 0. UX completa = PLANO 1 (não misturar com P2 / visão 3D).

---

## Residuals

| ID | Residual | Por quê ficou de fora | Direção sugerida |
|----|----------|----------------------|------------------|
| R1 | `updateSavedVehicle` progressivo | Fundação entregou insert + listagem; re-salvar cria outro registro | API update no mesmo `customer_vehicles.id` (maker/model/ano/motor/versão/textos/FKs) + UI conta “completar veículo” |
| R2 | Política Edge VV `incomplete` no mestre | Lookup pode criar `vehicle_versions` “abertas” (ano/motor/versão nulos) — risco PLANO §15 | Apertar `allowCanonicalUpsert` / exigir ano (ou maker+model+ano) antes de criar VV; não inventar `version_name` |
| R3 | `source_snapshot` jsonb (API completa) | Hoje só `engineRaw`/`versionRaw` + colunas texto na garagem | Coluna snapshot (ou blob) no cache/placa e/ou garagem; fuel/câmbio opcionais na UI, sem virar filtro PVC |
| R4 | Confirmação manual não re-upserta mestre | Só Edge na consulta (ou import admin) grava mestre | Decidir se edição na confirmação deve chamar upsert autenticado/staff — fora da fundação |
| R5 | Suite §12 e2e restante | Unit + smokes manuais cobrem o crítico; faltam #5–7/#11–13/#16–18 automatizados | Expandir Vitest/Playwright quando houver harness estável |
| R6 | Histórico `supabase db push` divergente | Migration progressive aplicada via `db query` | Alinhar migration history com ordem explícita do eFe — sem `repair` improvisado |
| R7 | Dedup garagem por placa | Flush OK; segundo “Sim, salvar” pode duplicar linha | Upsert por `(customer_id, plate)` ou merge explícito na conta |

---

## O que NÃO é residual (já decidido)

- PVC **não** é criado no save da garagem / placa.
- Etapa 7 UX Minha Garagem = [FAL_GARAGE_VISAO_FUNCIONAL.md](../futuro/FAL_GARAGE_VISAO_FUNCIONAL.md) — plano separado.
- Higiene em massa de opções legadas (ex. fabricante `CHEV` no mestre) = ops/dados, não fundação.

---

## Ordem sugerida (quando retomar)

1. **R1** update progressivo (desbloqueia edição de incompletos na conta)  
2. **R2** política VV incomplete no Edge (protege qualidade do mestre)  
3. **R7** dedup por placa  
4. **R3** snapshot jsonb  
5. **R5** / **R6** conforme capacidade de QA/ops  
