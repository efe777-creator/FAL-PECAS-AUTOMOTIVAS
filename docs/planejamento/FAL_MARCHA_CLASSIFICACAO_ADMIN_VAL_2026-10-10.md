# MARCHA — Classificação admin (Categoria → Grupo → Subgrupo)

**Data:** 2026-10-10  
**Estado:** VALIDADO (unit + critérios de código; smoke staff residual)  
**Rota:** `/admin/categorias`  
**Alinhamento:** planilha import `categoria` / `grupo` / `subgrupo`  
**Runtime:** `wtbpwuiayednvlhvuhbh`

---

## Escopo

Controlar na mesma tela nós **importados** e **manuais** (3 níveis), sem auto-criar na importação de produtos.

| Critério | Status |
|----------|--------|
| Labels L1/L2/L3 = Categoria / Grupo / Subgrupo | OK |
| Lista plana + árvore + filtro por nível | OK |
| Mostrar arquivadas (default on) + publicar em massa | OK |
| Pai do Grupo = só Categorias | OK |
| Pai do Subgrupo = Categoria → só Grupos daquela categoria (nome do grupo) | OK |
| Ícone só na Categoria (raiz) | OK |
| Coluna `emoji` no DB | OK (migration aplicada) |
| Cadastro produto usa mesma hierarquia | OK |
| Import exige nós published existentes | OK (enforceExistingCategories) |

---

## Arquivos

- `fal-pecas/src/pages/admin/categories/AdminCategoriesPage.tsx`
- `fal-pecas/src/services/admin/adminCategoryService.ts` (+ test)
- `fal-pecas/src/pages/admin/products/AdminProductFormPage.tsx`
- `fal-pecas/src/lib/categoryEmoji.ts` (+ test)
- `fal-pecas/supabase/migrations/20261010190000_product_categories_emoji.sql`

---

## Evidências

| Tipo | Resultado |
|------|-----------|
| Unit hierarchy + emoji | **12/12 PASS** (`adminCategoryService` + `categoryEmoji`) |
| DB (10/10) | 10 cat · 38 grupos · 7 sub · 16 pub / 39 arq; coluna `emoji` |
| Smoke staff UI | Residual: login admin → editar grupo/subgrupo + criar sob cascata |

---

## Fora de escopo

- Auto-criar classificação na import de produtos  
- Smoke MP / D-FRETE / E2E pago (trilhos α comerciais)  
- B3 / Bloco F  

---

## Smoke residual (humano staff)

```text
1. /admin/categorias — lista com arquivadas
2. Filtro “Só grupos” / “Só subgrupos”
3. + Subgrupo → Categoria → Grupo pai (só nomes de grupo)
4. Editar nó importado / Publicar arquivada
5. Produto → Classificação Categoria/Grupo/Subgrupo
```
