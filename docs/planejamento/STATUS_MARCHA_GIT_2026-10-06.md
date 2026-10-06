# Status marcha Git — F9-A impl 2026-10-06

## Tips

| Branch | Tip |
|--------|-----|
| `plan` | _(este commit)_ |
| `dev` | `23cd21e` |
| `main` | `c03afd4` (PR #5) |

## Feito (F9-A impl)

- Migration `20261006200000_fase9a_payments_mp_foundation_prepared.sql`
- Colunas MP em `payments` + tabela `payment_events`
- RLS + revoke write customer
- Apply linked + `schema_migrations`
- Vitest payments 6 PASS + build PASS
- PR #5 MERGED

## STOP

Sem Edge Functions · SDK MP · webhook · checkout MP · `db push` completo · F9-B até MARCHA.

## Residual

F9-B…I · F8.6–8.8 · F10
