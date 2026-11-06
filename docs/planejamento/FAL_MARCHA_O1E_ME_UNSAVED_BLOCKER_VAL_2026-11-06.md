# VAL — O1-E / O0-B: bloqueio SPA Melhor Envio com edições não salvas

**Data:** 2026-11-06  
**Auth:** MARCHA  
**Item:** residual O0-B no hub ME — sync já avisava; faltava `useBlocker` + `beforeunload` ao sair da página

## Entrega

| Peça | Mudança |
|------|---------|
| `AdminMelhorEnvioPage` | `useUnsavedChangesBlocker(dirty)` + `beforeunload` quando há edições |

## Critérios

- [x] Com linha suja, link do menu admin pede confirmação
- [x] “Continuar editando” permanece na página
- [x] Após salvar (`dirty` limpo via reload), navegação livre
- [x] Fechar aba continua com aviso nativo
- [x] Sync dirty (ConfirmDialog) inalterado
- [x] `tsc -b` OK

## Gate humano

Etiqueta M7 / D-FRETE C — inalterados.
