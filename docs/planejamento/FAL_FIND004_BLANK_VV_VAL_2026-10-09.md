# FIND-004 MARCHA 1 — VAL blank → todas as VVs

**Data:** 2026-10-09  
**Autorização:** MARCHA (eFe)  
**Escopo:** correção de cobertura `versao` vazia — **sem** apply em massa  
**Prompt:** [FAL_FIND004_MARCHA1_PROMPT_BLANK_VV_2026-10-09.md](./FAL_FIND004_MARCHA1_PROMPT_BLANK_VV_2026-10-09.md)

---

## Contrato (antes → depois)

| Situação | Antes | Depois |
|----------|-------|--------|
| Modelo resolvido + `versao` vazia + ≥1 VV ativa | Match/create **1** VV `version_name` vazio | **N** linhas lógicas (1 PVC por VV do modelo), mesmos anos |
| Modelo resolvido + blank + 0 VV | createVersion envelope | **inalterado** (1 envelope) |
| `versao` preenchida | match/create por nome + split `1.0/1.6` | **inalterado** |
| `ano_fim` vazio | `year_end` null | **inalterado** (preservado na expansão) |

## Camada alterada

- **Mínima:** `fal-pecas/src/services/import/applicationImportCore.ts` (`listVersionsForModel` + ramo blank em `analyzeApplicationMappedRows`)
- Apply SQL / RPC: **não** tocado (payload expandido já congela `vehicle_version_id` por item)
- Importação em massa: **continua BLOQUEADA**

## Testes

`npx vitest run src/services/import/applicationImportCore.test.ts` → **23 passed** (T1–T6 + regressão anterior).

| ID | Resultado |
|----|-----------|
| T1 blank + 3 VVs | 3 applyable, IDs distintos |
| T2 blank + 0 VV | 1 createVersion |
| T3 explícita | 1 linha, VV nomeada |
| T4 ano_fim vazio | `yearEnd === null` pós-expansão |
| T5 outro model_id | não inclui VV alheia |
| T6 PVC parcial | covered na VV existente; new nas demais |

## STOP

- **Não** revalidar planilha 691 nesta marcha (MARCHA 3).  
- **Não** import admin (MARCHA 4).  
- Pendências fonte: `TDI0150;;;;;`, `ano_inicio` vazio (decisão), 21 reviews.
