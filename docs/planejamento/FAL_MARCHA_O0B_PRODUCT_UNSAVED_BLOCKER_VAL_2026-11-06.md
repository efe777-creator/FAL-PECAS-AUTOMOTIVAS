# VAL — O0-B: bloqueio SPA de produto com alterações não salvas

**Data:** 2026-11-06  
**Auth:** MARCHA  
**Item:** plano O0-B — toast/`beforeunload` já existiam; faltava `useBlocker` na navegação in-app

## Entrega

| Peça | Mudança |
|------|---------|
| `useUnsavedChangesBlocker` | `useBlocker` + `confirmDialog` (sair / continuar) |
| `AdminProductFormPage` | Hook quando `dirty`; mantém `beforeunload` |

## Critérios

- [x] Com Geral sujo, link do menu admin pede confirmação
- [x] “Continuar editando” permanece na página
- [x] Após salvar (`dirty=false`), navegação livre
- [x] Fechar aba continua com aviso nativo
- [x] `tsc -b` OK

## Gate humano

Nenhum.
