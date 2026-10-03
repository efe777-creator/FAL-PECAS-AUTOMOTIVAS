# Especificação — Fase 4: Motor de Busca

**Status:** Implementada — ver [EXECUCAO_FASE4.md](./EXECUCAO_FASE4.md) e [AUDITORIA_FASE4_2026-10-03.md](./AUDITORIA_FASE4_2026-10-03.md)  
**Data:** 2026-10-03  
**Branch de trabalho:** `plan`  
**Base:** [DATABASE.md](../entrada/DATABASE.md), [API.md](../entrada/API.md), [UX.md](../entrada/UX.md), [ROADMAP_FASES_3.0.md](./ROADMAP_FASES_3.0.md)  
**Fase anterior:** [ESPECIFICACAO_FASE3_CATALOGO_COMERCIAL.md](./ESPECIFICACAO_FASE3_CATALOGO_COMERCIAL.md) (aprovada)

---

## 1. Objetivo

Permitir que o cliente **encontre** peças por texto, SKU, referência, categoria, fabricante e veículo, com ranking, filtros combináveis, ordenação e paginação — tudo server-side.

Responde: *como o cliente encontra o que procura?*

---

## 2. Escopo

### Implementar

- Contrato único `searchService.searchCatalog` + tipos `ProductSearchParams` / `ProductSearchResult` / `ProductSearchSort`
- RPC Postgres `public.search_products(...)` (SECURITY INVOKER, respeita RLS)
- Ranking: SKU exato > ref exata > ref parcial > nome > `search_document`; desempate `name ASC`
- Termos: split + `unaccent` / ilike; **AND** entre termos textuais
- Filtros: categoria (+ filhas), brand, veículo via PVC; OR dentro do grupo / AND entre grupos; **NULL ≠ universal**
- Paginação offset; `pageSize` padrão **24**; `total` do banco
- UI catálogo: sort, Carregar mais, loading/empty/contador; URL `q/cat/maker/model/year/engine/version/brand/sort/page`
- Extensão `unaccent` + índices mínimos (sem duplicar os da F2/F3)

### Fora

- Checkout, carrinho novo, conta (F5/F6)
- Busca por placa
- Meilisearch / Elasticsearch
- Inventar dados comerciais
- Queries de compatibilidade por `name.includes('Palio')`
- Expor `quantity` / inventory ao público
- `service_role` no frontend

---

## 3. Decisões fechadas

| Tema | Decisão |
|------|---------|
| Stack | React + TS + Vite + Supabase/Postgres |
| Contrato | `fal-pecas/src/services/search/searchService.ts` |
| Backend | RPC `search_products` — ranking + filtros + count + offset |
| Página UI | **Carregar mais** (acumula no state; backend page/offset) |
| Sort | `relevance` \| `price_asc` \| `price_desc` \| `name_asc` \| `name_desc` |
| Segurança | Só `published`; sem quantity; SECURITY INVOKER |

---

## 4. Contrato TypeScript

```ts
type ProductSearchSort = 'relevance' | 'price_asc' | 'price_desc' | 'name_asc' | 'name_desc'

interface ProductSearchParams {
  q?, category?, brand?, maker?, model?, year?, engine?, version?
  sort?, page?, pageSize?
}

interface ProductSearchResult {
  items: Product[]
  total: number
  page: number
  pageSize: number
  hasMore: boolean
}
```

`CatalogPage` chama **somente** `searchCatalog` (remove list+filter+search separado).

---

## 5. RPC `search_products`

**Params:** `p_q`, `p_category`, `p_brand`, `p_maker`, `p_model`, `p_year`, `p_engine`, `p_version`, `p_sort`, `p_page`, `p_page_size`.

**Regras:**

1. Texto: cada termo (após unaccent/lower) deve casar em SKU **ou** ref ativa **ou** nome **ou** `search_document` **ou** brand **ou** `manufacturer_code`.
2. Score por termo (máx): SKU exato 1000, ref exata 800, ref parcial 600, nome 400, search_document/brand/código 200; score total = soma.
3. Veículo: intersect via `product_vehicle_compatibility` + `vehicle_versions` com `eq` estrito nos campos preenchidos.
4. Categoria: produto na categoria ou filha (slug/id/nome).
5. Brand: `product_brands` por nome ou id.
6. Retorno: colunas públicas do produto + `brand_name` + `category_name` + `relevance_score` + `total_count` (window).
7. Grant `EXECUTE` a `anon` e `authenticated`.

---

## 6. Critérios de aceite (amostra)

| ID | Caso |
|----|------|
| CA-01 | `PVI1032` encontra produto published com essa ref |
| CA-02 | `Nakata PVI1032` (AND) |
| CA-03 | `Pivô Palio` |
| CA-04 | Fiat + Palio + 2015 via PVC |
| CA-05 | Motor 1.0 ≠ 1.4 (NULL estrito) |
| CA-06 | Archived fora dos resultados |
| CA-07 | Contador = `total` do banco |
| CA-08 | Carregar mais acumula páginas |
| CA-09 | Sort por preço/nome |
| CA-10 | URL com `sort` e `page` |

---

## 7. Módulos de execução

| Módulo | Entrega |
|--------|----------|
| F4-M1 | Índices/unaccent, tipos, stub `searchService`, docs |
| F4-M2 | RPC + testes SQL |
| F4-M3 | UI `CatalogPage` |
| F4-M4 | Auditoria, fixtures paginação, ROADMAP |

---

## 8. Fixtures de paginação

Criar temporárias `published` para validar CA-08; **arquivar** após auditoria (não apagar).
