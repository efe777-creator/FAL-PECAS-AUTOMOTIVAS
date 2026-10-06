# Gate F8.5 — status 2026-10-06 (conclusão pré-migration)

| Item | Status |
|------|--------|
| Opção A | **FECHADA** (Plano Mestre §6.4) |
| Código F8.5 + prepared SQL | em `dev` (`f1fe91c` ⊂ tip) |
| P1-1 LIST_SELECT `%` + fallback | **PASS** — `feat/f8.5-p1-list-select-save-order` @ `27c53bf` → `dev` `ae4c054` |
| P1-2 ordem save `%` → regra/recalc | **PASS** |
| Testes | **73 PASS** / 11 files (pós-P1) |
| Build | **PASS** |
| Smoke **pré-migration** (`/admin/precos`) | **PASS** — `pendingMigration` ao salvar `%`; regra salva; manual skip; preview `40→46` @ 10%; sem vazamento entre listas |
| Smoke pós-apply | **PENDENTE** |
| `db push` / apply `20261006160000_…` | **NÃO EXECUTADO** — exige frase explícita (este relatório **não** autoriza) |
| PR `dev→main` | **não aberto** |
| `feat/vitrine-category-icons` | **fora** (intacta) |

## Tips

| Branch | Tip |
|--------|-----|
| `dev` | `ae4c054` |
| `feat/f8.5-p1-list-select-save-order` | `27c53bf` |
| `main` | `aa83df5` (atrasada) |

## STOP

Pré-migration **concluída**. Próximo só com auth explícita:

`autorizo db push da prepared 20261006160000_list_extra_cost_percent_prepared.sql`

Depois: smoke pós-apply → auth PR `dev→main`.
