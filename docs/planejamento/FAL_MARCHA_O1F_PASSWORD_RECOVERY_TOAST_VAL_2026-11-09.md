# VAL — toast recuperar / redefinir senha

**Data:** 2026-11-09  
**Auth:** MARCHA (código local — sem commit/push)  
**Item:** O1-F / O0-A — `ForgotPasswordPage` + `ResetPasswordPage`

## Entrega

- Recuperar: toast erro (`toUserMessage`) + toast sucesso ao enviar link
- Redefinir: toast validação, erro e sucesso ao salvar
- Inline mantido nas duas páginas

## Critérios

- [x] `tsc --noEmit` OK
- [x] Sem cutover / D-FRETE / secrets

## Gate humano

Nenhum. Ship git sob demanda.
