# Diagnóstico — Filtro de categoria (V1)

**Data:** 2026-11-12  
**Auth:** eFe — auditoria precisão busca  
**Projeto:** `wtbpwuiayednvlhvuhbh`  
**Escopo:** somente leitura (código + SQL). Sem migration / write / deploy.

## 1. Fluxo atual

```
CatalogPage selects (categoria/grupo/subgrupo)
  → ?cat=<slug>
  → searchCatalog({ category: slug, ... })
  → RPC search_products(p_category := slug)
  → CTE cat_ids = nó + descendentes
  → products.category_id IN cat_ids AND status = 'published'
```

| Camada | Arquivo / objeto | Papel |
|--------|------------------|--------|
| UI | `fal-pecas/src/pages/Catalog/CatalogPage.tsx` | `setCategoryFacet` grava **slug** em `?cat=` |
| Serviço | `fal-pecas/src/services/search/searchService.ts` | `p_category: effective.category` |
| Categorias | `fal-pecas/src/services/categories/categoryService.ts` | Lista published; `attachCategoryMeta` |
| RPC | `search_products` (mig. `20261111140000_…`) | Match id **ou** slug **ou** lower(name) + filhos |
| Banco | `product_categories`, `products.category_id` | Árvore parent_id; vínculo N:1 produto→nó |

## 2. Cadastro observado (evidência)

- **38** categorias; **7** raízes.
- **100** produtos `published` no total.
- Distribuição real de `category_id`:

| Nó | Slug | Published | Observação |
|----|------|-----------|------------|
| DIREÇÃO (raiz) | `direcao` | **99** | Quase todo o catálogo |
| C/ROLAMENTO (folha sob SUSPENSÃO→…) | `c-rolamento` | **1** | Único fora de DIREÇÃO |
| TERMINAL DE DIREÇÃO (filho de DIREÇÃO) | `terminal-de-direcao` | **0** | Nó existe, vazio |
| AXIAL DE DIREÇÃO | `axial-de-direcao` | **0** | Vazio |
| PIVÔ (sob SUSPENSÃO) | `pivo` | **0** | Vazio |
| Demais grupos/subgrupos | — | **0** | Árvore ornamental |

Produtos com **nome** “TERMINAL DE DIREÇÃO” / “PIVO” estão vinculados ao slug **`direcao`** (raiz), não aos grupos homônimos.

## 3. Reproduções RPC

| Entrada `p_category` | Resultado `count` | Status |
|----------------------|-------------------|--------|
| `direcao` | 99 | OK — mecanismo funciona |
| `DIREÇÃO` (nome) | 99 | OK — match por nome |
| `c-rolamento` | 1 | OK |
| `terminal-de-direcao` | **0** | Sintoma do usuário |
| `axial-de-direcao` | **0** | Idem |
| `pivo` | **0** | Idem |
| `suspensao` | 1 | OK (só via descendente `c-rolamento`) |

CTE para `terminal-de-direcao`: **1** id na árvore, **0** published — RPC correta.

## 4. Hipóteses × veredito

| # | Hipótese | Veredito |
|---|----------|----------|
| H1 | Produtos no nó errado (não descendente do filtro) | **CAUSA-RAIZ** |
| H2 | Interseção com veículo “esconde” categoria | Não necessário para o empty observado; possível agravante se YMM ativo |
| H3 | Slug órfão / mismatch UI | Não — slugs existem e batem |
| H4 | Só draft no admin | Não — 100 published; RPC exige published |

## 5. Causa-raiz

**Dados:** vínculos `products.category_id` concentrados na **raiz** `direcao`, enquanto a UI oferece grupos/subgrupos **folhas** (ex.: Terminal, Axial, Pivô) sem produtos. O mecanismo de categoria da RPC **não está quebrado**; o filtro de grupo/subgrupo retorna vazio porque o cadastro não classifica nas folhas.

## 6. Correções recomendadas (não implementadas nesta fase)

| Tipo | Ação | Prioridade |
|------|------|------------|
| **Dados** | Remapear produtos da raiz DIREÇÃO → folhas corretas (Terminal / Axial / etc.) por nome/SKU/regra de import | **P0** |
| **Dados** | Auditoria admin: produtos em raiz com filhos existentes = alerta de integridade | P1 |
| **UI** | Empty state: “Nenhum produto neste grupo — há N na categoria pai” + atalho limpar grupo | P1 |
| **Código** | Não substituir RPC por consulta paralela; opcional filtro “incluir não classificados da raiz” só se produto aprovar (fora do núcleo atual) | P2 / decisão |

## 7. Riscos

- Remap em massa sem regra clara → produto na folha errada.
- Mudar RPC para “subir” produtos da raiz ao filtrar filho **mascara** o problema de dados e quebra a taxonomia.

## 8. Critério de aceite (pós-correção dados)

- Filtrar `terminal-de-direcao` retorna SKUs cujo nome/categoria esperada é Terminal.
- Filtrar `direcao` (raiz) continua incluindo filhos (comportamento atual da CTE).
- Matriz CSV casos CAT-* = PASS com evidência de count > 0.
