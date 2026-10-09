# FAL-IMP-06 / VAL-06 — Importações + histórico UI

**Data:** 2026-10-09  
**Gate:** Onda 1  
**Escopo:** UI unificada sobre `imports` / `import_items` (todos kinds) — FIND-009  
**Runtime:** `wtbp…` — kinds observados: catalog, supplier_cost, supplier_conversion (+ price_list / applications quando houver)

---

## 1. Auditado

| Item | Antes |
|------|--------|
| Histórico UI | Só aba Importações da lista de preços (`kind=price_list`) |
| Staging | Já persistia em `imports`/`import_items` em todos os pipelines |
| Nav admin | Sem entrada de histórico global |

---

## 2. Causas

Pipelines gravavam runs; superfície operacional só existia no módulo de preço (CR-06 / FIND-009).

---

## 3. Alterado

| Camada | Mudança |
|--------|---------|
| [`adminImportHistoryService.ts`](../../fal-pecas/src/services/admin/adminImportHistoryService.ts) | `adminListImports` + `adminGetImportRunDetail` (todos kinds) |
| [`importLabels.ts`](../../fal-pecas/src/lib/importLabels.ts) | Rótulos PT de kind/status + rotas de wizard |
| [`AdminImportsPage`](../../fal-pecas/src/pages/admin/imports/AdminImportsPage.tsx) | `/admin/importacoes` — filtros, tabela, detalhes |
| Router + `AdminLayout` | Rota e menu **Importações** |
| Lista de preços / produtos | Links para o histórico unificado |
| `adminListPriceListImports` / `adminGetImportDetail` | Delegam ao serviço unificado |

**Kinds cobertos:**

```text
catalog | catalog_applications | supplier_conversion | supplier_cost | price_list
```

---

## 4. Não alterado

| Item | Motivo |
|------|--------|
| Contratos / apply / wizards de import | Já funcionam; IMP-06 = observabilidade |
| `import_profiles` (prepared) | Apply P2 paralelo (higiene migrations) |
| Re-apply / replay de run | Fora de escopo |

---

## 5. VAL-06

| Teste | Resultado |
|-------|-----------|
| Vitest `importLabels` + `formatImportReportSummary` | **5 passed** |
| SQL runtime: kinds catalog/cost/conversion presentes | **OK** (evidência pré-impl) |

---

## 6. Status

| | |
|--|--|
| FAL-IMP-06 | **Concluído** |
| FAL-VAL-06 | **PASS** |
| FIND-009 | **Fechado** |

**Próximo bloco (plano Onda 1):** `FAL-IMP-05` (veículos/aplicações).
