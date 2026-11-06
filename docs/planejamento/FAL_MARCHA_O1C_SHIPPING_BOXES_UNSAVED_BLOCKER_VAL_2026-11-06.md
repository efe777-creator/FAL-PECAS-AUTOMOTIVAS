# VAL — O1-C / O0-B: bloqueio SPA caixas com formulário não salvo

**Data:** 2026-11-06  
**Auth:** MARCHA  
**Item:** residual O0-B no hub de caixas — edições podiam se perder ao navegar no admin

## Entrega

| Peça | Mudança |
|------|---------|
| `AdminShippingBoxesPage` | `dirty` + `useUnsavedChangesBlocker` + `beforeunload` + banner; limpa ao salvar/cancelar/carregar edição |

## Critérios

- [x] Editar campo → banner + bloqueio SPA
- [x] Salvar / Cancelar / Editar outra limpa dirty
- [x] `tsc -b` OK

## Gate humano

Nenhum.
