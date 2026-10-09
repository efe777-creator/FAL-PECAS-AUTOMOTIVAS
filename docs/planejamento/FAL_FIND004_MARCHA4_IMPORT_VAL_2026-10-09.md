# FIND-004 MARCHA 4 — VAL importação administrativa controlada

**Data:** 2026-10-09  
**Autorização:** MARCHA (eFe)  
**Runtime:** `wtbpwuiayednvlhvuhbh`  
**Import id:** `695cde3b-b338-47f7-934a-65f1673c3865`  
**Status import:** `done`

**Pré-condições:** M1–M3 VAL · política applyable-only (RPC pula review/error)

---

## Política aplicada

| Regra | Valor |
|-------|-------|
| Stage | Todas as 743 linhas lógicas (preview pós blank→VVs) |
| Apply | `apply_catalog_applications_import` com sessão staff (admin) |
| Review (21) | **skipped_review** — não inventar match |
| Erro TDI0150 (1) | **skipped_error** — não completar campos |
| Create product | 0 (Frente B) |

Scripts: `fal-pecas/scripts/find004-m4-stage-apply.run.ts` → `.sql` · evidência em `imports.report.m4_evidence`.

---

## Resultado apply (FATO)

| Métrica | n |
|---------|---|
| total_processed | 743 |
| created_applications | 4 |
| updated_applications | 693 |
| already_covered | 24 |
| skipped_review | 21 |
| skipped_error | 1 |
| created_products | 0 |
| created_manufacturers | 0 |
| created_models | 2 |
| created_versions | 2 |
| PVC before → after | 730 → **734** (Δ +4) |
| VV active before → after | 267 → **269** (Δ +2) |

Nota: dump M3 (`versions: 11`) estava **desatualizado** vs runtime (267 VV). Por isso o dry-run superestimava `createVersion`; no apply live a maioria resolveu VV existente (`existing_versions` 695) e atualizou períodos PVC.

---

## Cobertura comercial (FATO pós-apply)

| Check | Antes (recontagem/auditoria) | Depois |
|-------|------------------------------|--------|
| products published com ≥1 PVC | **17**/100 | **100**/100 |
| `1307B` × Palio VVs | 1 envelope | **5 PVC / 5 VV** |

---

## Idempotência

| Check | Resultado |
|-------|-----------|
| Import status | `done` |
| Reapply mesmo `import_id` | Bloqueado pelo gate Nível A (`status done`) — contrato RPC |

---

## Pendências remanescentes

- 21 linhas review (não aplicadas) — corrigir cadastro/planilha em marcha futura  
- `TDI0150;;;;;` — erro fonte  
- UI “Mais aplicações” / anos `YY/YY` — trilho UI (não feito nesta marcha)

---

## Veredicto

| Campo | Valor |
|-------|-------|
| MARCHA 4 | **OK** |
| Apply em massa planilha | **Executado** (controlado; skips corretos) |
| Próxima | MARCHA 5 smoke card/PDP/filtros |

**STOP M5** até nova MARCHA explícita.
