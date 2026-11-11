# FAL_AUDITORIA_ARQUITETURA_BUSCA_V1

**Data:** 2026-11-11  
**Modo:** somente leitura  
**Projeto Supabase auditado (SQL):** `owllmfcpbodqmoerdfxx` (sa-east-1)  
**Repo:** `fal-pecas/` · https://github.com/efe777-creator/FAL-PECAS-AUTOMOTIVAS.git

Legenda: **FATO** · **HIPÓTESE** · **NÃO VERIFICADO** · **RECOMENDAÇÃO**

---

## 1. Resumo

Existe **um contrato de listagem** (`searchCatalog` → RPC `search_products`), mas **dois canais de entrada incompatíveis**:

1. Texto livre (`q`) — AND em campos do produto.
2. Filtro veicular (`maker/model/year/engine/version`) — join PVC/VV.

Não há interpretador que traduza `HB20 2015` em filtros veiculares.  
Além disso, o **banco publicado está atrás do código/migrations do repo** (RPC de ano ainda usa `vv.year = p_year`, sem intervalo PVC).

---

## 2. Front-end — inventário

| Componente | Path | Papel | FATO |
|------------|------|-------|------|
| SearchBar | `src/components/navigation/SearchBar.tsx` | Combobox; Enter → `/catalogo?q=` **somente** | Sim |
| Header | `src/components/navigation/Header.tsx` | Monta SearchBar + nav | Sim |
| CatalogPage | `src/pages/Catalog/CatalogPage.tsx` | Lê `q/cat/brand/maker/model/year/engine/version/sort/page`; chama `searchCatalog` | Sim |
| VehicleSelector | `src/components/vehicle/VehicleSelector.tsx` | YMM → `buildVehicleQuery` → URL estruturada | Sim |
| ProductCard | `src/components/product/ProductCard.tsx` | Render; apps via summary | Sim |
| ProductPage | `src/pages/Product/ProductPage.tsx` | PDP; apps até 40 entradas | Sim |
| NavBar | `src/components/navigation/NavBar.tsx` | Categorias raiz → `?cat=` | Sim |
| useProductSearch | `src/hooks/useCatalog.ts` | Debounce 220ms; min 2 chars; suggestions | Sim |
| searchCopy | `src/lib/searchCopy.ts` | Placeholder promete “aplicação ou veículo” | Sim |

**Empty states (FATO):** CatalogPage diferencia “sem peças para este veículo” vs busca textual vazia.  
**Mobile (FATO):** drawer de filtros; SearchBar sticky; grid 2 colunas.

**FATO:** param `vehicle=1` é escrito por `buildVehicleQuery` e **não** é lido pelo CatalogPage.

---

## 3. Serviços / back-end

| Serviço | Path | Entrada | Saída / RPC |
|---------|------|---------|-------------|
| searchCatalog | `services/search/searchService.ts` | ProductSearchParams | `search_products` |
| searchProductSuggestions | idem | q, limit | `search_product_suggestions` |
| prepareSearchQuery | `services/search/searchPrepService.ts` | q | expansão sinônimos (se flag) |
| expandSearchQuery | `lib/searchQueryExpand.ts` | tokens | sinônimos |
| filterProductIdsByVehicle | `services/products/productService.ts` | VehicleFilter | IDs via PostgREST PVC (espelho; catálogo usa RPC) |
| attachCompatibilitySummaries | `services/products/compatibilitySummary.ts` | product ids | texto/grupos de apps |
| attachResolvedPrices | `services/pricing/priceResolutionService.ts` | products | `resolve_product_prices` |
| getVehicleOptions | `services/vehicles/vehicleService.ts` | — | árvore + anos PVC |

**Cache (FATO):** prep sinônimos 5 min (código); categorias 5 min; **sem** cache de resultados RPC.  
**NÃO VERIFICADO em prod:** tabelas `store_search_prep` / `search_synonyms` — **ausentes** no projeto SQL auditado.

---

## 4. RPCs e migrations (repo vs produção)

### Repo — canônico pretendido

| Migration | Função |
|-----------|--------|
| `20261110160000_search_products_blank_engine_version_wildcard.sql` | `search_products` com PVC `year_start/end` + wildcard engine/version vazios |
| `20261105190000_search_product_suggestions.sql` | autocomplete produtos |
| `20261105220000_search_prep_ia.sql` | sinônimos + `build_product_search_document` |
| `20261003230000_fase4_search_indexes.sql` | `f_unaccent` + índices |

### Produção (`owllmfcpbodqmoerdfxx`) — FATO SQL 2026-11-11

| Item | Estado |
|------|--------|
| `search_products` | Corpo usa `vv.year = v_year::integer` (sem range PVC) |
| Wildcard engine/version vazios | **Não** no corpo atual |
| `search_synonyms` / `store_search_prep` | **Não existem** |
| Coluna `products.commercial_ref` | **Não existe** |

**FATO:** drift repo → produção é bloqueador operacional independente do bug de interpretação textual.

---

## 5. Trace HB20 2015 (código + SQL)

### Canal texto (FATO código)

```
SearchBar → /catalogo?q=HB20%202015
→ prepareSearchQuery
→ search_products(p_q='HB20 2015', vehicle params null)
→ termos AND ['hb20','2015'] em sku/name/search_document/refs
→ search_document NÃO inclui PVC/anos
→ 2015 falha → 0
```

SQL prod: `q='HB20'` → 0; `q='HB20 2015'` → 0 (produtos não trazem “HB20” no texto).

### Canal seletor (FATO código + SQL prod)

```
VehicleSelector → maker=HYUNDAI&model=HB20&year=2015
→ search_products(p_year='2015')
→ PRODUÇÃO: exige vv.year = 2015
→ VV HB20 tem year=2012 → 0 resultados
→ year=2012 → 2 SKUs (TDI2116, TDI2117)
```

PVC real: `year_start=2012`, `year_end=null` (deveria incluir 2015 **se** a migration `…1160000` estivesse aplicada).

### Evidência TinyFish (externa)

TinyFish reportou seletor 2015 1.0 → 3 produtos (BRD2109, TDI2116, TDI2117).  
**FATO:** no banco atual, BRD2109 **não** está em `products`; seletor 2015 via RPC → 0.  
**HIPÓTESE:** ambiente TinyFish ≠ estado atual deste projeto, ou dados/migrations mudaram depois do run.  
**RECOMENDAÇÃO:** revalidar no site publicado após alinhar migrations.

---

## 6. Ranking, paginação, performance

| Tema | FATO |
|------|------|
| Ranking | Score por termo (sku 1000 … doc 200); soma AND |
| Page size | 24 (cap 100) |
| Match | `LIKE '%term%'` + `f_unaccent` — sem FTS/pg_trgm |
| Índices | btree `search_document`, sku, refs, PVC — pouco eficazes para `%x%` |

---

## 7. O que preservar

1. Contrato único `searchCatalog`.
2. PVC como fonte de verdade de fitment (quando RPC correta).
3. URL como estado do catálogo.
4. Separação published vs is_available.
5. Suggestions leves vs listagem enrich.
6. Prep de sinônimos (quando migrado).
7. Empty states por contexto veículo.
8. Preço via `resolve_product_price` (quando listas ok).

## 8. Limitações desta auditoria

- Não reexecutamos o run TinyFish no browser nesta sessão.
- Um único projeto Supabase na conta MCP; binding Netlify↔projeto **NÃO VERIFICADO** via env de produção.
- EXPLAIN/latência sob carga **NÃO VERIFICADO**.
