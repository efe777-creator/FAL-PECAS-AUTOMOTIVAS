# Auditoria baseline Git — 2026-10-06

**Branch atual:** `plan` @ `0eb01f8`  
**Remote:** `origin` → `https://github.com/efe777-creator/FAL-PECAS-AUTOMOTIVAS.git`  
**safe.directory:** liberado (sem alteração de user.name/email)

---

## Branches

| Branch | Commit | Tracking |
|--------|--------|----------|
| `plan` | `0eb01f8` docs(f8.1): especifica catálogo… | `origin/plan` |
| `dev` | `aa83df5` docs(auditoria): PRD vs situação pós-F8 | `origin/dev` |
| `main` | `aa83df5` (igual a `dev`) | `origin/main` |

**Divergência:** `plan` está **1 commit à frente** de `dev`/`main`. `dev` ≡ `main`.

---

## Working tree (resumo)

### Modificados (código F8.1–F8.4 ainda não commitados)
Inclui, entre outros: `AdminProductsPage`, `AdminProductFormPage`, `AdminCategoriesPage`, `AdminPriceListsPage`, `AdminPriceListDetailPage`, brands/manufacturers, `adminPriceListService`, `adminCategoryService`, `adminProductService`, router, storefront pages, `package.json`.

### Untracked relevante F8.4 / F8.1
- Docs: `PLANO_MESTRE_F8_…`, `RELATORIO_FINAL_F8_4_…`, auditorias F8.2–F8.4, backlog, specs F8.1/F9, etc.
- Código: `PriceListQuickAdjustPanel`, `PriceImportWizard`, imports admin, `pricingFormulas`, services import/fase81, testes.
- Migrations applied-ready F8.1b–f + **prepared** `%` / L3 / M / N (ainda não aplicadas ao banco nesta política).

### Ruído (não versionar)
`agent-tools-*`, `fal-pecas/supabase/.temp/`, pasta `ARQUIVOS IMPORTAÇÕES/`, etc.

---

## Conclusão para próximos passos

1. Commit/push em **`plan`**: só `docs/planejamento`.
2. Levar código F8.4 para **`dev`** (sem apply migration, sem `main`).
3. F8.5 Opção A em feature branch a partir de `dev`.
