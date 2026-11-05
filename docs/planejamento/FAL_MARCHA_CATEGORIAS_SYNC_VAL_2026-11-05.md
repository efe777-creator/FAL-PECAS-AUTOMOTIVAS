# VAL — MARCHA Categorias sync (CRUD → loja/admin)

**Data:** 2026-11-05  
**Auth:** eFe — `MARCHA`  
**Problema:** CRUD de classificação não refletia de forma confiável (cache stale, slug regenerado, N faces desatualizadas, dedupe só na criação).

---

## Escopo

Garantir que criar / editar / arquivar / excluir / mesclar / reordenar categorias atualize:

- Cache loja + listeners (Header, Home, Catálogo, Admin produtos)
- Facetas Categoria→Grupo→Subgrupo
- Card (nome + link `?cat=`)
- PDP / busca (slug via `attachCategoryMeta`)
- Sem duplicar nome no mesmo nível (create **e** update)
- Slug estável no rename (não quebra URL)

---

## Critérios

| # | Critério | Resultado |
|---|----------|-----------|
| 1 | `bumpCategoriesRevision` em upsert/status/publishAll/merge/delete/reorder | **PASS** |
| 2 | Slug preservado no update se não enviado | **PASS** |
| 3 | Dedupe nome normalizado no update | **PASS** |
| 4 | Sufixo `-n` se slug colidir | **PASS** |
| 5 | `useCategories` + Catálogo + Admin produtos refetch no evento | **PASS** |
| 6 | `attachCategoryMeta` no `searchCatalog` | **PASS** |
| 7 | Card mostra classificação com link | **PASS** |
| 8 | Cascata admin filtro `publishedOnly` | **PASS** |
| 9 | Facetas ordenadas por `sort_order` | **PASS** |
| 10 | `tsc --noEmit` | **PASS** |

---

## Como validar (operador 2 min)

1. Admin → Classificações → renomear um Grupo (sem mudar slug) → Salvar.  
2. Abrir Catálogo (mesmo browser) → faceta deve mostrar nome novo **sem F5**.  
3. Criar irmão com mesmo nome → erro “Já existe…”.  
4. Arquivar nó vazio → some da loja; republicar → volta.  
5. Card de produto na busca: linha da classificação clicável.

---

## STOP / residual

- RPC `search_products` ainda pode omitir `category_slug` nativo (enriquecimento client cobre).  
- Path completo “A › B › C” na PDP = follow-up.  
- Produtos órfãos em categoria arquivada (merge legado) = relatório integridade já lista.

**Assinatura:** VAL categorias sync PASS 2026-11-05.
