# VAL — O1-I formulário + barra da classificação (minuciosa)

**Data:** 2026-11-06  
**Auth:** MARCHA minuciosa  
**Item:** Extrair UI da `AdminCategoriesPage` sem mudar comportamento

## Entrega

| Peça | Papel |
|------|--------|
| `CategoriesEditorForm` | Criar/editar (pais, ícone, medidas padrão, ações) |
| `CategoriesBrowseBar` | Busca + nível + Lista/Árvore |
| `AdminCategoriesPage` | Estado, árvore/lista, CRUD — orquestra |

## Critérios

- [x] `tsc --noEmit` OK
- [x] Página ~1240 → ~910 linhas
- [x] Expandir/Recolher permanece na página (só modo árvore)

## Residual O1-I

- [x] Extrair `CategoriesBrowsePanel` (lista + árvore) — VAL 2026-11-06b

## Gate humano

Nenhum.
