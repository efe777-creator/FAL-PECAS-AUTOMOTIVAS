# FIND-004 MARCHA 2 — VAL correção blank→VVs

**Data:** 2026-10-09  
**Autorização:** MARCHA (eFe)  
**Pré-condição:** [MARCHA 1 VAL](./FAL_FIND004_BLANK_VV_VAL_2026-10-09.md)  
**Modo:** validação dry-run + testes — **sem apply**

---

## Veredicto

**OK para avançar à MARCHA 3** (reval quantitativa completa da planilha).  
Importação em massa permanece **BLOQUEADA**.

---

## Casos validados

| Caso | Evidência | Resultado |
|------|-----------|-----------|
| Multi-VV (Palio, 5 VVs ativas) | Dry-run wtbp: linha 2 `1307B` → `expandedTo=5`, `coversAllModelVvs=true`, sem `createVersion` | **OK** |
| Versão explícita | `explicitVersionRows=380`; unit T3 + M2 split `1.0/1.6` | **OK** (sem expansão indevida) |
| Duplicidade no arquivo | M2: 2ª linha blank mesma chave → `already_covered` / `duplicateOfLine`; PVC parcial T6 | **OK** |
| Intervalo de anos | M2 blank `2008–2017` preservado nas N VVs | **OK** |
| `ano_fim` vazio | Unit T4; dry-run `openEndYearNullCount=160` em blank preview | **OK** (`yearEnd` null) |
| Escopo modelo | Unit T5; Palio não puxa Siena | **OK** |

**Vitest:** `applicationImportCore.test.ts` → **25 passed** (T1–T6 + M2).

**Dry-run:** `scripts/find004-preval.run.ts` → `find004-preval-result.json` (`generatedAt` 2026-10-09T18:41:35Z).

### Antes × depois (blank)

| Métrica | Pré MARCHA 1 | Pós MARCHA 1/2 |
|---------|--------------|----------------|
| CSV blank | 311 | 311 |
| Preview blank | 311 | **363** (ratio ≈ 1,17) |
| blank com `vehicleVersionId` | 33 | **97** |
| blank `createVersion` | 265 | **253** |
| Palio blank → todas VVs | não | **sim (5/5)** |
| applyable (técnico) | 645 | **697** |

Preview total ≠ 691: expansão blank gera linhas lógicas extras — reconciliar na **MARCHA 3**.

---

## Consulta / filtros (cobertura comercial)

Fonte de verdade do catálogo: `product_vehicle_compatibility` + `vehicle_versions` (`productService` / `compatibilitySummary`).

| Caminho | Impacto da correção |
|---------|---------------------|
| Filtro montadora/modelo/ano | Após apply, blank passa a gerar **PVC por VV** → produto aparece para qualquer VV do modelo no período |
| Filtro `version_name` | Cobre VVs nomeadas (ex. Fire); VVs com `version_name` null no cadastro **não** batem nesse filtro (dado legado wtbp, não inventado pelo motor) |
| Card / PDP | `groupCompatibilityApps` lista uma linha por PVC — cobertura blank passa a refletir N VVs, não 1 envelope |

Sem apply nesta marcha: caminho de leitura **inalterado**; garantia é no **payload** expandido (IDs de VV corretos).

---

## Observações (não bloqueiam MARCHA 2)

- Palio wtbp tem **5** VVs ativas (incl. várias `version_name` null + 2× Fire) — motor associa **todas**; limpeza de VV duplicadas é tema de cadastro, não desta marcha.
- Ainda: `TDI0150;;;;;` (1 erro), 21 reviews, decisão `ano_inicio` vazio.
- Apply / MARCHA 4 **não** autorizados.

---

## Próximo

**MARCHA 3** — revalidar 691 linhas com classificação reconciliada (CSV × preview expandido) + pendências review/erro.
