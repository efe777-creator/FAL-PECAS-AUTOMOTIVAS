# Gate F8.5 — status 2026-10-06

| Item | Status |
|------|--------|
| Opção A | **FECHADA** (Plano Mestre §6.4) |
| Código + prepared SQL (callers) | em `dev` (`f1fe91c` ⊂ `454ce50`) |
| Branch feat | `feat/f8.5-list-extra-cost-percent` @ `f1fe91c` (já mergeada em `dev`) |
| Testes (revalidado 2026-10-06 ~15:38) | **78 PASS** / 12 files |
| Build | **PASS** |
| Smoke browser pós-apply | **PENDENTE** (coluna `%` ainda não no banco) |
| `db push` / apply migration | **NÃO EXECUTADO** — exige frase explícita |
| PR `dev→main` | **não aberto** |
| Merge `main` | **bloqueado** até apply (se autorizado) + smoke + humano |

Prepared: `fal-pecas/supabase/migrations/20261006160000_list_extra_cost_percent_prepared.sql`

Próximo (só com auth): `db push` → smoke calculated/manual/imported + checkout → auth PR `dev→main`.
