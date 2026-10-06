# Gate F8.5 — status 2026-10-06 (atualizado na reauditoria)

| Item | Status |
|------|--------|
| Opção A | **FECHADA** (Plano Mestre §6.4) |
| Código + prepared SQL (callers) | em `dev` (`f1fe91c`) |
| Testes / build (último relatório) | PASS (sessão anterior) |
| Smoke browser pós-apply | **PENDENTE** (coluna `%` ainda não no banco) |
| `db push` / apply migration | **NÃO EXECUTADO** — exige frase explícita de autorização |
| PR `dev→main` | **não aberto** |
| Merge `main` | **bloqueado** até apply (se autorizado) + smoke + aprovação humana |

Após apply autorizado: smoke calculated vs manual/imported + 1 checkout → só então auth para abrir PR `dev→main`.

Prepared: `fal-pecas/supabase/migrations/20261006160000_list_extra_cost_percent_prepared.sql`
