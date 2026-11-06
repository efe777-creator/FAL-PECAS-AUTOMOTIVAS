# VAL — O1-F: regra de senha visível no login (+ constante única)

**Data:** 2026-11-06  
**Auth:** MARCHA  
**Item:** plano O1-F — “regra de senha visível” no login; cadastro/redefinir usavam mínimo 6 duplicado

## Entrega

| Peça | Mudança |
|------|---------|
| `authPassword.ts` | `MIN_PASSWORD_LENGTH` + hint/mensagem |
| `LoginPage` | `hint` + `minLength` na senha |
| `RegisterPage` / `ResetPasswordPage` | passam a usar o módulo compartilhado |
| `authPassword.test.ts` | mínimo e copy alinhados |

## Critérios

- [x] Login mostra “Mínimo de 6 caracteres.”
- [x] Cadastro e redefinir usam a mesma constante/copy
- [x] `vitest` authPassword OK
- [x] `tsc -b` OK

## Gate humano

Nenhum.
