# VAL — P1-LOG-HIST (histórico de medidas)

**Data:** 2026-11-05  
**Auth:** eFe — `MARCHA`  
**Runtime:** `wtbpwuiayednvlhvuhbh`  
**Migration:** `20261105160000_product_measure_change_history.sql`

---

## Escopo

Auditoria de alterações de peso/dims/POL/porte/frete próprio no produto (form + bulk).

---

## Critérios

| # | Critério | Resultado |
|---|----------|-----------|
| 1 | Tabela `product_measure_change_history` + RLS staff | **PASS** (SQL) |
| 2 | Trigger AFTER UPDATE em `products` | **PASS** (SQL) |
| 3 | `measure_audit_source` efêmero (manual/bulk no mesmo UPDATE) | **PASS** |
| 4 | UI histórico no form de produto | **PASS** (código) |
| 5 | Bulk global marca `source=bulk` | **PASS** (código) |
| 6 | Apply SQL wtbp | **PASS** — `db query --remote` 05/11 |
| 7 | `tsc -b` | **PASS** |

---

## Smoke

1. Editar peso no form → Salvar → histórico lista alteração `manual`.  
2. Bulk medidas em Produtos → histórico `bulk` nos SKUs afetados.

---

## STOP

P1-LOG-HIST código fechado. Filtros logísticos peso/dims na listagem = fora deste VAL.

**Assinatura agente:** VAL P1-LOG-HIST 2026-11-05.
