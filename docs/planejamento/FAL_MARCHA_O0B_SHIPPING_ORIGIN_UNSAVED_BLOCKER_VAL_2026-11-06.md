# VAL — O0-B: bloqueio SPA origem/expedição com alterações não salvas

**Data:** 2026-11-06  
**Auth:** MARCHA  
**Item:** residual O0-B — formulário de origem podia perder edições ao navegar no admin

## Entrega

| Peça | Mudança |
|------|---------|
| `AdminShippingOriginPage` | `dirty` nos campos; `useUnsavedChangesBlocker` + `beforeunload`; banner; limpa ao salvar |

## Critérios

- [x] Editar remetente/endereço → banner + bloqueio SPA
- [x] Salvar limpa dirty
- [x] Fechar aba com dirty → aviso nativo
- [x] `tsc -b` OK

## Gate humano

Nenhum.
