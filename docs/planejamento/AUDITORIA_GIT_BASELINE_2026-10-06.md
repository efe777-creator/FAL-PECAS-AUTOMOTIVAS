# Auditoria baseline Git — FINAL 2026-10-06

**Coletado em:** 2026-10-06 ~16:15 (local)  
**Remote:** `origin` → `https://github.com/efe777-creator/FAL-PECAS-AUTOMOTIVAS.git`  
**Opção A / Gate F8.5:** **FECHADOS**  
**PR #1:** MERGED

---

## Tips atuais

| Branch | Tip | Nota |
|--------|-----|------|
| `main` / `origin/main` | **`762c697`** | Merge PR #1 (`dev→main`) |
| `dev` / `origin/dev` | **`ae4c054`** | ancestral de main (fast-forward via merge commit) |
| `plan` / `origin/plan` | _(docs gate final)_ | só docs |

`main` contém F8.4 + F8.5 (+P1) + F9-A.

### Feature branches (já ancestral de `main`)

| Branch | Tip | Nota |
|--------|-----|------|
| `feat/f8.4-baseline` | `bba6c47` | não re-mergear |
| `feat/f8.5-list-extra-cost-percent` | `f1fe91c` | não re-mergear |
| `feat/f8.5-p1-list-select-save-order` | `27c53bf` | não re-mergear |
| `feat/f9-a-frete-correios` | `454ce50` | não re-mergear |
| `feat/vitrine-category-icons` | `69ed277` | **fora** da trilha — ainda não em `dev`/`main` |

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

1. Pacote crítico F8.4/F8.5/F9-A está em **`main` @ `762c697`**.  
2. Gate F8.5 **fechado**.  
3. Próximo trabalho: F9-B+ ou vitrine — **só com auth explícita**.  
4. Não rodar repair em massa sem auth.
