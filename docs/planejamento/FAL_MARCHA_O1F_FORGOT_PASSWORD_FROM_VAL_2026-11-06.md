# VAL — O1-F: preservar `from` no fluxo Esqueci minha senha

**Data:** 2026-11-06  
**Auth:** MARCHA sequencial  
**Item:** checkout → login → recuperar senha perdia o retorno ao funil

## Entrega

| Peça | Mudança |
|------|---------|
| `LoginPage` | Link “Esqueci minha senha” repassa `state.from` |
| `ForgotPasswordPage` | Lê `from` e devolve no “Voltar ao login”; `autoComplete` no e-mail |

## Critérios

- [x] Funil com `from=/checkout` sobrevive ao ir/voltar de recuperar senha
- [x] Sem `from`, links seguem sem state
- [x] `tsc -b` OK

## Gate humano

Nenhum.
