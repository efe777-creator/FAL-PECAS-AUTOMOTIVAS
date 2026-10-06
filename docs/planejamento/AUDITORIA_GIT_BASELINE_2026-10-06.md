# Auditoria baseline Git — FINAL 2026-10-06

**Coletado em:** 2026-10-06 ~16:15 (local)  
**Remote:** `origin` → `https://github.com/efe777-creator/FAL-PECAS-AUTOMOTIVAS.git`  
**Opção A / Gate F8.5:** **FECHADOS**  
**PR #1:** MERGED

---

## Tips atuais

| Branch | Tip | Nota |
|--------|-----|------|
| `main` / `origin/main` | **`1abea37`** | PR #4 F9-C; inclui #3/#2/#1 |
| `dev` / `origin/dev` | **`a739c9d`** | F8.x + F9-A/B/C + vitrine |
| `plan` / `origin/plan` | _(docs)_ | só docs |

`main` contém F8.4 + F8.5 (+P1) + F9-A + vitrine + F9-B + **F9-C**.

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

1. Pacote crítico + vitrine + F9-A/B/**C** em **`main` @ `1abea37`**.  
2. Próximo: F9-D ou F8.6+ — **MARCHA**.  
3. Não rodar repair em massa sem auth.
