# VAL — O1-B: relatório de integridade + mesclar A→B

**Data:** 2026-11-06  
**Auth:** MARCHA  
**Item:** service `adminCategoryIntegrityReport` existia sem UI; merge A→B não existia

## Entrega

| Peça | Mudança |
|------|---------|
| `adminMergeCategory` | Reatribui produtos, arquiva origem; bloqueia filhos ativos / ancestral→descendente |
| Relatório | Contagem de produtos por nó duplicado |
| `CategoriesIntegrityPanel` | UI em Classificação: duplicatas + arquivados com produto + Mesclar |
| Gate massa | ConfirmDialog; merge em massa continua revisão humana |

## Critérios

- [x] Abrir relatório em `/admin/categorias`
- [x] Duplicatas listam path + qty produtos
- [x] Mesclar pede confirmação e arquiva origem
- [x] `tsc -b` OK

## Gate humano

Merge em massa / limpeza grande de árvore — revisão eFe antes de volume.
