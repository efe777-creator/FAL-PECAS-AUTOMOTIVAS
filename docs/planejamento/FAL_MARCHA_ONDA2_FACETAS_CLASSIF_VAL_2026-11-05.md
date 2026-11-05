# VAL — MARCHA Onda 2 · Facetas classificação (P2)

**Data:** 2026-11-05  
**Auth:** eFe — `MARCHA`  
**Plano:** Onda 2 · item 22 facetas

---

## Escopo

Catálogo loja: filtro **Categoria → Grupo → Subgrupo** (mesmo vocabulário da planilha).  
`?cat=` continua sendo o slug do nó mais específico; RPC `search_products` já inclui subárvore.

---

## Critérios

| # | Critério | Resultado |
|---|----------|-----------|
| 1 | Carrega `listAllCategories` (cache Onda 2 P1) | **PASS** |
| 2 | Três selects em cascata no catálogo | **PASS** |
| 3 | Chip mostra caminho `A › B › C` | **PASS** |
| 4 | Limpar nível sobe para o pai (slug) | **PASS** |
| 5 | `tsc --noEmit` | **PASS** |

---

## STOP

Próximo Onda 2: batch favoritos · slug PDP · RPC sugestões leve.

**Assinatura:** VAL Onda 2 facetas PASS 2026-11-05.
