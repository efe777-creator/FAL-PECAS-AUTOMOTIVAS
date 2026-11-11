# FAL_AUDITORIA_PRODUTOS_CLASSIFICACAO_V1

**Data:** 2026-11-11 · Somente leitura  
**SQL:** `owllmfcpbodqmoerdfxx`

---

## 1. Contagens produção

| Métrica | Valor |
|---------|------:|
| products published | 49 |
| published sem category_id | 0 |
| published sem PVC | 1 |
| categories published | 19 |
| categories L1 (raiz) | 4 |
| brands (schema) | via `product_brands` |

---

## 2. Identificação

| Campo | Repo | Produção |
|-------|------|----------|
| `sku` unique | FATO | FATO (TDI2116/TDI2117 presentes) |
| `commercial_ref` unique | Migration `…09120000` | **AUSENTE** (SQL: column does not exist) |
| `manufacturer_code` | FATO | NÃO VERIFICADO amostra ampla |
| `product_references` | types: manufacturer, oem, internal, competitor, other | NÃO VERIFICADO volume |
| BRD2109 | Em dump `scripts/find004-catalog-raw.json` | **Ausente** em `products` |

**FATO:** SKUs de terminais HB20 publicados: TDI2116, TDI2117. Axial BRD2109 não está no banco atual (diverge TinyFish).

---

## 3. Classificação (categoria / grupo / subgrupo)

**FATO:** árvore única `product_categories.parent_id` (L1 raiz → L2 → L3).  
Produto tem **um** `category_id`.  
RPC `p_category` inclui subtree recursiva.  
UI CatalogPage: Categoria → Grupo → Subgrupo via slug `?cat=`.

Seed L1/L2 no repo; L3 prepared (`…category_l3_seed_prepared.sql`) marcado para não apply automático — **NÃO VERIFICADO** se L3 completo está em prod (19 published sugere árvore enxuta).

---

## 4. Conteúdo e atributos

| Campo | Uso na busca |
|-------|----------------|
| name, description, short_description | ranking / doc |
| search_document | LIKE (rebuild no repo; função pode faltar em prod) |
| posicao / lado | enrich pós-RPC; não no SELECT da RPC |
| imagens | `product_images` + attach primary |

---

## 5. Dados comerciais / preço

| Achado | Label |
|--------|-------|
| TDI2116/TDI2117 `price=0.00`, `promo_price` null | **FATO** SQL |
| Resolução canônica: override → lista public → default (`resolve_product_price`) | **FATO** código |
| Search sort usa `try_resolve_product_amount` | **FATO** repo RPC nova |
| Cart/PDP usam `attachResolvedPrices` / `displayPrice` | **FATO** |
| Divergência TinyFish de preços entre contextos | **HIPÓTESE** até auditar `resolve` vs `price` no site; com price 0,00 a origem é cadastro/lista |

**RECOMENDAÇÃO:** não “corrigir UI de preço” antes de popular listas/`price` corretos.

---

## 6. Import admin

| Fluxo | Service | RPC |
|-------|---------|-----|
| Produtos | `adminCatalogImportService` | `apply_catalog_products_import` |
| Apps | `adminApplicationsImportService` | `apply_catalog_applications_import` |
| HF bundle | `adminHfBundleImportService` | bundle |

**FATO:** versão products import sem auto-criar categorias (`…180100`).

---

## 7. Problemas

| ID | Descrição | P |
|----|-----------|---|
| PRO-01 | `commercial_ref` no código/repo sem coluna em prod | P0 drift |
| PRO-02 | BRD2109 ausente vs evidência TinyFish/dump | P0 dados |
| PRO-03 | Preços 0,00 em SKUs publicados | P0 comercial |
| PRO-04 | 1 produto published sem PVC | P1 |
| PRO-05 | Árvore L3 incompleta vs taxonomia comercial desejada | P2 |

## 8. Preservar

SKU único, árvore de categorias, import congelado em `import_items`, resolução de preço centralizada, refs tipadas.
