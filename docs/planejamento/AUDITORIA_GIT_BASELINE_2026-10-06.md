# Auditoria baseline Git — FINAL 2026-10-06

**Coletado em:** 2026-10-06 ~16:15 (local)  
**Remote:** `origin` → `https://github.com/efe777-creator/FAL-PECAS-AUTOMOTIVAS.git`  
**Opção A / Gate F8.5:** **FECHADOS**  
**PR #1:** MERGED

---

## Tips atuais

| Branch | Tip | Nota |
|--------|-----|------|
| `main` / `origin/main` | **`ede8acf`** | PR #3 F9-B; inclui vitrine (#2) + F8.5 (#1) |
| `dev` / `origin/dev` | **`b061abf`** | F8.x + F9-A/B + vitrine |
| `plan` / `origin/plan` | _(docs)_ | só docs |

`main` contém F8.4 + F8.5 (+P1) + F9-A + vitrine + **F9-B**.

### Feature branches (já ancestral de `main`)

| Branch | Tip | Nota |
|--------|-----|------|
| `feat/f8.4-baseline` | `bba6c47` | não re-mergear |
| `feat/f8.5-list-extra-cost-percent` | `f1fe91c` | não re-mergear |
| `feat/f8.5-p1-list-select-save-order` | `27c53bf` | não re-mergear |
| `feat/f9-a-frete-correios` | `454ce50` | não re-mergear |
| `feat/vitrine-category-icons` | `69ed277` | ancestral de `dev`/`main` — **não re-mergear** |

---

## Migration / gates

| Item | Status |
|------|--------|
| Prepared F8.5 | versionada + **aplicada** no linked |
| `schema_migrations` `20261006160000` | **registrada** (insert pontual) |
| Smoke pós-apply | SQL **PASS** (limites de seed aceitos) |
| PR `dev→main` | **MERGED** #1 |
| F9-A | **validado** em `main` (testes shipping PASS) |

---

## Conclusão

1. Pacote crítico + vitrine + **F9-B** em **`main` @ `ede8acf`**.  
2. Gate F8.5 **fechado**; F9-A/B **promovidos**.  
3. Próximo: F9-C ou F8.6+ — **MARCHA**.  
4. Não rodar repair em massa sem auth.
