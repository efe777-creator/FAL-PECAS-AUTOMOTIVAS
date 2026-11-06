# VAL — O0-B: bloqueio SPA classificação com formulário não salvo

**Data:** 2026-11-06  
**Auth:** MARCHA  
**Item:** residual O0-B — editar categoria/grupo/subgrupo podia perder alterações ao navegar no admin

## Entrega

| Peça | Mudança |
|------|---------|
| `AdminCategoriesPage` | `dirty` nos campos do editor; `useUnsavedChangesBlocker` + `beforeunload`; banner; limpa ao salvar/reset/carregar |

## Critérios

- [x] Editar nome/medidas → banner + bloqueio SPA
- [x] Salvar / Limpar / Abrir outra limpa dirty
- [x] `tsc -b` OK

## Gate humano

Nenhum (merge em massa = revisão eFe).
