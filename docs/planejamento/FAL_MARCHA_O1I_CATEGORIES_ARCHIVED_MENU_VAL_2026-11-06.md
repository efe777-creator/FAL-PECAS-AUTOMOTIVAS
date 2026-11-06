# VAL — O1-I menu Arquivados da classificação

**Data:** 2026-11-06  
**Auth:** MARCHA minuciosa  
**Item:** Extrair menu arquivados + UI helpers de `AdminCategoriesPage`

## Entrega

| Peça | Papel |
|------|--------|
| `categoryAdminUi` | `categoryStatusLabel` + `CategoryIconThumb` (vitest) |
| `CategoriesArchivedMenu` | Abrir/fechar, seleção, publicar/excluir + toast |
| `AdminCategoriesPage` | ~1.438 → ~1.246 linhas |

## Critérios

- [x] `tsc --noEmit` OK
- [x] Vitest `categoryAdminUi.test.ts` OK
- [x] EmptyState aponta para o link do resumo (sem abrir menu externo)

## Residual

Formulário + árvore/lista ainda na página — próximas MARCHAs.
