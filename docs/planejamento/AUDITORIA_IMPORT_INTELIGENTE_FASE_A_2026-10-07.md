# Auditoria técnica (read-only) — Import Inteligente · Fase A

**Data:** 2026-10-07  
**Escopo:** código e migrations em `fal-pecas/` (Supabase + services + admin UI)  
**Objetivo:** baseline factual para decidir como importar **aplicações veiculares** (compatibilidade) sem quebrar busca, admin e importações F8.1 existentes.  
**Tipo:** somente leitura — **sem** `db push`, commit ou alteração de schema.

---

## 0. Contexto e delimitação da Fase A

No repositório **não há** spec nomeada “Import Inteligente Fase A”. Esta auditoria interpreta **Fase A** como:

1. Entender o **modelo de dados atual** (montadoras → modelos → `vehicle_versions` → `product_vehicle_compatibility` → `products`).
2. Mapear **como a loja filtra por ano/motor** (`search_products` + UI de veículo).
3. Contrastar **import `kind=catalog` atual** (montadora ≠ compatibilidade) com o que seria necessário para importar aplicações (ex.: planilhas com SKU + montadora + modelo + intervalo de anos).
4. Recomendar **uma** evolução concreta de schema para suportar intervalos de ano na aplicação.

Referências internas relevantes:

| Documento | Conteúdo |
|-----------|----------|
| `docs/planejamento/ESPECIFICACAO_FASE3_CATALOGO_COMERCIAL.md` §9 | Hierarquia veículo; aplicações parciais; NULL estrito na busca |
| `docs/planejamento/ESPECIFICACAO_FASE4_MOTOR_BUSCA.md` | Filtro veículo via PVC + `vehicle_versions` |
| `docs/planejamento/ESPECIFICACAO_FASE8_1_IMPORTACAO_CATALOGO.md` | Import catálogo ≠ publicação; montadora separada |
| `cursor_fal_automotive_parts_project.md` (F8.7) | Montadora importada **não** vira compatibilidade automaticamente |

---

## 1. DDL efetivo (estado acumulado das migrations)

Fonte primária: `fal-pecas/supabase/migrations/20261003180000_fase2_schema_rls.sql`, com acréscimos em `20261003200000_fase3_schema_storage.sql` e `20261004030000_fase6c_addresses_freight.sql`.  
**Nenhuma migration posterior altera** `manufacturers`, `models`, `vehicle_versions` ou `product_vehicle_compatibility`.

### 1.1 `public.manufacturers`

```sql
create table public.manufacturers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  status text not null default 'active' check (status in ('active', 'inactive')),
  created_at timestamptz not null default now()
);
```

**Índices / constraints adicionais:** nenhum além de PK e `slug` UNIQUE.

**RLS (resumo):** leitura pública `status = 'active'`; escrita staff (`authenticated` + policies Fase 3).

---

### 1.2 `public.models`

```sql
create table public.models (
  id uuid primary key default gen_random_uuid(),
  manufacturer_id uuid not null references public.manufacturers (id) on delete cascade,
  name text not null,
  slug text not null,
  status text not null default 'active' check (status in ('active', 'inactive')),
  created_at timestamptz not null default now(),
  unique (manufacturer_id, slug)
);
```

**Observação:** não há UNIQUE em `(manufacturer_id, name)` — apenas `(manufacturer_id, slug)`.

---

### 1.3 `public.vehicle_versions`

```sql
create table public.vehicle_versions (
  id uuid primary key default gen_random_uuid(),
  manufacturer_id uuid not null references public.manufacturers (id) on delete cascade,
  model_id uuid not null references public.models (id) on delete cascade,
  year int,
  engine text,
  version_name text,
  status text not null default 'active' check (status in ('active', 'inactive')),
  created_at timestamptz not null default now()
);

create index vehicle_versions_filter_idx
  on public.vehicle_versions (manufacturer_id, model_id, year, engine);
```

**Gaps importantes para import inteligente:**

| Tema | Situação atual |
|------|----------------|
| UNIQUE natural (montadora + modelo + ano + motor + versão) | **Não existe** — duplicatas são possíveis |
| Intervalo de anos (`2010–2015`) | **Não modelado** — um ano por linha |
| Campos nullable | `year`, `engine`, `version_name` nullable (aplicação parcial F3) |

**Consumidores:** `vehicleService.getVehicleOptions`, admin veículos, `search_products`, `productService` (filtro legado auxiliar), `customer_vehicles.version_id`.

---

### 1.4 `public.product_vehicle_compatibility` (PVC)

```sql
create table public.product_vehicle_compatibility (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products (id) on delete cascade,
  vehicle_version_id uuid not null references public.vehicle_versions (id) on delete cascade,
  notes text,
  created_at timestamptz not null default now(),
  unique (product_id, vehicle_version_id)
);

create index pvc_product_idx on public.product_vehicle_compatibility (product_id);
create index pvc_version_idx on public.product_vehicle_compatibility (vehicle_version_id);
```

**Semântica operacional:** uma linha = “este produto se aplica a **esta** configuração de veículo (`vehicle_version_id`)”. Ano e motor vêm **indiretamente** de `vehicle_versions`.

**RLS leitura pública:** PVC visível se existir produto `published` associado (`20261003185000_fase2_fix_rls_grants.sql`).

---

### 1.5 `public.products` (colunas relevantes para catálogo + import)

**Base Fase 2:**

```sql
create table public.products (
  id uuid primary key default gen_random_uuid(),
  sku text not null unique,
  name text not null,
  slug text not null unique,
  description text,
  brand_id uuid references public.product_brands (id) on delete set null,
  category_id uuid references public.product_categories (id) on delete set null,
  price numeric(12, 2) not null check (price >= 0),
  promo_price numeric(12, 2) check (promo_price is null or promo_price >= 0),
  status text not null default 'draft' check (status in ('draft', 'published', 'archived')),
  manufacturer_code text,
  search_document text,
  seo_title text,
  seo_description text,
  is_incomplete boolean not null default false,
  is_available boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index products_status_idx on public.products (status);
create index products_category_idx on public.products (category_id);
```

**Fase 3** (`20261003200000_fase3_schema_storage.sql`):

```sql
alter table public.products add column if not exists short_description text;
alter table public.products add column if not exists supplier_id uuid references public.suppliers (id) on delete set null;
alter table public.products add column if not exists attrs jsonb not null default '{}'::jsonb;
create index if not exists products_supplier_idx on public.products (supplier_id);
```

**Fase 6C** (`20261004030000_fase6c_addresses_freight.sql`):

```sql
alter table public.products add column if not exists weight_kg numeric(10, 3) check (...);
alter table public.products add column if not exists height_cm numeric(10, 2) check (...);
alter table public.products add column if not exists width_cm numeric(10, 2) check (...);
alter table public.products add column if not exists length_cm numeric(10, 2) check (...);
```

**Trigger:** `products_updated_at` → `set_updated_at()` (Fase 2).

**Uso na importação catálogo:** upsert por `sku`; montadora vai para `attrs.montadora_sugerida` (não PVC).

---

### 1.6 Diagrama de relações (estado atual)

```text
manufacturers ──< models ──< vehicle_versions
                                    ^
                                    │
                    product_vehicle_compatibility
                                    │
                              products (sku UNIQUE)
```

---

## 2. Como `search_products` usa ano e motor

**Arquivo:** `fal-pecas/supabase/migrations/20261003240000_fase4_search_products_rpc.sql`  
**Última versão no repo:** mesma migration (não há `create or replace` posterior).

### 2.1 Parâmetros de veículo

Entrada textual (trim + null se vazio): `p_maker`, `p_model`, `p_year`, `p_engine`, `p_version`.

### 2.2 CTE `vehicle_product_ids` (trecho exato)

A filtragem veicular acontece **somente** se pelo menos um parâmetro de veículo foi informado. Ano e motor aplicam-se **na tabela `vehicle_versions`**, não na PVC:

```sql
vehicle_product_ids as (
  select distinct pvc.product_id
  from public.product_vehicle_compatibility pvc
  join public.vehicle_versions vv on vv.id = pvc.vehicle_version_id
  join public.manufacturers mk on mk.id = vv.manufacturer_id
  join public.models md on md.id = vv.model_id
  where (v_maker is not null or v_model is not null or v_year is not null
         or v_engine is not null or v_version is not null)
    and vv.status = 'active'
    and (v_maker is null or lower(mk.name) = lower(v_maker))
    and (v_model is null or lower(md.name) = lower(v_model))
    and (v_year is null or vv.year = v_year::integer)
    and (v_engine is null or vv.engine = v_engine)
    and (v_version is null or vv.version_name = v_version)
),
```

### 2.3 Regras de matching (comportamento)

| Filtro UI | SQL | Efeito |
|-----------|-----|--------|
| Ano informado | `vv.year = v_year::integer` | **Igualdade estrita**; `vv.year IS NULL` **não** casa |
| Motor informado | `vv.engine = v_engine` | **Igualdade estrita** (case-sensitive em Postgres para `text`) |
| Montadora/modelo | `lower(name) = lower(param)` | Case-insensitive |
| Nenhum filtro veicular | — | Não restringe por PVC (produtos published passam pelo resto dos filtros) |
| Combinação | AND entre parâmetros preenchidos | Todos os filtros informados devem satisfazer a **mesma** linha `vv` ligada ao produto via PVC |

**Consequência para import:** um produto vinculado a `vehicle_version` com `year NULL` **desaparece** do resultado quando o cliente escolhe um ano específico no catálogo — alinhado à decisão F3 (evitar falso positivo).

### 2.4 Cliente TypeScript

`fal-pecas/src/services/search/searchService.ts` repassa:

```ts
p_year: params.year?.trim() || null,
p_engine: params.engine?.trim() || null,
```

`getVehicleOptions()` monta listas de anos/motores **a partir de `vehicle_versions.year` / `.engine`**, não de PVC.

### 2.5 Código auxiliar legado (não é o motor principal)

`productService.getProductIdsByVehicle` replica lógica similar (eq estrito em `year`/`engine` em `vehicle_versions`) para cenários fora do RPC. O catálogo público deve usar **apenas** `searchCatalog` → RPC.

---

## 3. `adminAddApplication` e unicidade PVC

### 3.1 Fluxo UI

`AdminProductFormPage.tsx`: operador escolhe montadora → modelo → **configuração** (`vehicle_versions.id`: ano / motor / versão) → botão **Vincular** chama `adminAddApplication(productId, versionId)`.

### 3.2 Implementação service

```ts
// fal-pecas/src/services/admin/adminProductService.ts
export async function adminAddApplication(productId: string, vehicleVersionId: string, notes?: string) {
  const { error } = await getSupabase().from('product_vehicle_compatibility').insert({
    product_id: productId,
    vehicle_version_id: vehicleVersionId,
    notes: notes?.trim() || null,
  })
  if (error) throw error
}
```

| Aspecto | Comportamento |
|---------|----------------|
| Upsert | **Não** — apenas `INSERT` |
| Pré-checagem de duplicata | **Não** no client |
| Unicidade | Constraint DB `unique (product_id, vehicle_version_id)` |
| Duplicata | Erro Postgres (tipicamente `23505`); UI exibe `error.message` genérico |
| `notes` | Opcional; não entra na unique |
| Remoção | `adminRemoveApplication(id)` — delete por `pvc.id` |

### 3.3 Seed / import manual idempotente

Em seeds comerciais (`20261003220000_fase3_seed_commercial_products.sql`):

```sql
insert into public.product_vehicle_compatibility (...)
on conflict (product_id, vehicle_version_id) do nothing;
```

O **admin manual** não usa `ON CONFLICT`; só o seed.

### 3.4 Implicação para import em massa

Para importar aplicações:

- Repetir o mesmo par `(product_id, vehicle_version_id)` falha ou exige `ON CONFLICT DO NOTHING/UPDATE`.
- **Dois intervalos de ano** para a **mesma** configuração base **não** cabem na unique atual — hoje seria necessário **duas** linhas `vehicle_versions` (anos diferentes) ou evoluir o modelo (ver §4 e §7).

---

## 4. PVC com `year_start` + `year_end` vs nova tabela de aplicações

### 4.1 PVC sozinha pode guardar intervalo?

**Sim, tecnicamente**, adicionando colunas à PVC (ou movendo o ano para lá), **desde que** `vehicle_versions` represente algo **sem** ano único (ex.: motor + versão + modelo) ou que o intervalo na PVC **sobreponha** o ano em `vv` na busca.

**Modelo conceitual:**

```text
vehicle_versions = configuração estável (montadora, modelo, motor, version_name)
PVC              = produto × configuração × [year_start, year_end] (+ notes)
```

### 4.2 Prós — evoluir PVC

| Pró | Detalhe |
|-----|---------|
| Menor superfície | Uma tabela já usada em RPC, admin, PDP (`compatibilitySummary`) |
| Alinhamento F3/F4 | Specs já centram compatibilidade em PVC + `vehicle_versions` |
| Import por intervalo | Uma linha PVC por SKU + config + faixa (planilha típica de autopeças) |
| Menos joins na busca | Lógica de ano concentra-se no join PVC (após ajuste do RPC) |

### 4.3 Contras — evoluir PVC

| Contra | Detalhe |
|--------|---------|
| Mudança de unique | `unique (product_id, vehicle_version_id)` impede duas faixas distintas na mesma config — precisa `(product_id, vehicle_version_id, year_start, year_end)` ou equivalente |
| RPC + índices | `search_products` e possivelmente `vehicle_versions_filter_idx` precisam redesign |
| Dupla fonte de ano | Durante transição, ano em `vv` **e** em PVC gera ambiguidade |
| UI admin | Formulário hoje escolhe **uma** linha `vehicle_versions` com ano embutido — precisa capturar faixa |
| `customer_vehicles` | Continua com `year` + `version_id` apontando para VV — reconciliação extra |

### 4.4 Prós — nova tabela (ex.: `product_applications`)

| Pró | Detalhe |
|-----|---------|
| Semântica explícita | Diferencia “configuração de catálogo” de “afirmação comercial de aplicação” |
| Import desacoplado | Poderia referenciar maker/model/engine textuais + faixa antes de resolver FKs |
| Migração gradual | PVC legado permanece enquanto nova tabela alimenta busca |

### 4.5 Contras — nova tabela

| Contra | Detalhe |
|--------|---------|
| Duplicação | Mesmo papel da PVC; risco de PVC e nova tabela divergirem |
| Mesmo trabalho na busca | RPC teria de unir **ou** migrar dados **para** um único destino de leitura |
| Mais RLS/policies/grants | Padrão Fase 3 replica staff write para cada entidade |
| Admin + PDP | Duplicar CRUD e `compatibilitySummary` |

---

## 5. Backfill se o ano migrar de `vehicle_versions` para PVC

Cenário: adicionar `year_start int null`, `year_end int null` em PVC; busca passa a usar faixa na PVC; `vehicle_versions.year` deixa de ser fonte de verdade (ou vira redundante).

### 5.1 Passos de dados

1. **DDL:** colunas nullable + check `year_end is null or year_start is null or year_end >= year_start`.
2. **Backfill inicial (1:1 com ano pontual):**
   ```sql
   update public.product_vehicle_compatibility pvc
   set
     year_start = vv.year,
     year_end = vv.year
   from public.vehicle_versions vv
   where vv.id = pvc.vehicle_version_id
     and vv.year is not null;
   ```
3. **Linhas com `vv.year IS NULL`:** manter `year_start`/`year_end` NULL (aplicação parcial F3) ou regra de negócio explícita pós-import.
4. **Deduplicação de `vehicle_versions`:** se várias linhas diferem **só** pelo ano, fundir para uma configuração + **N** PVCs com faixas distintas **ou** uma PVC com faixa agregada (min/max) — **decisão de negócio** (perda de granularidade vs volume de linhas).
5. **Opcional:** `update vehicle_versions set year = null` após backfill — **quebra** `getVehicleOptions()` até recalcular anos a partir de PVC ou view.
6. **Unique PVC:** dropar `unique (product_id, vehicle_version_id)`; criar unique parcial ou composta incluindo faixa.

### 5.2 Passos de aplicação

| Área | Ação |
|------|------|
| `search_products` | Trocar `vv.year = …` por `(v_year is null or (pvc.year_start is null and pvc.year_end is null and vv.year = …) or (pvc.year_start <= … and coalesce(pvc.year_end, pvc.year_start) >= …))` — **definir uma regra única**; evitar dupla leitura indefinida |
| `vehicleService` | Passar a agregar anos distintos de PVC join VV **ou** manter anos em VV para UI apenas |
| `adminAddApplication` | Inserir faixa; resolver/criar VV **sem** ano |
| `productService` / PDP | `compatibilitySummary` incluir faixa |
| `customer_vehicles` | Sem migration automática; clientes com `version_id` antigo continuam válidos se VV permanecer |
| Seeds / testes | Atualizar fixtures e seeds F3 |

### 5.3 Riscos

- Produtos publicados **somem** do filtro por ano se backfill falhar ou faixas ficarem NULL.
- Performance: filtro por faixa exige índice `(vehicle_version_id, year_start, year_end)` ou expressão indexada.
- Import inteligente **não** deve auto-publicar produtos (mesma regra F8.1).

---

## 6. Kinds de import atuais e limitações do import de catálogo

### 6.1 Tabela `imports` (evolução)

| Migration | Alteração |
|-----------|-----------|
| Fase 2 | `filename`, `status`, `created_by`, `report`, `created_at` |
| Fase 6B | `kind text not null default 'generic'`, `price_list_id uuid` |
| F8.1-C | `supplier_id uuid` (conversão/custo) |

**Nota:** no TypeScript, `kind` default `'generic'` ainda pode existir em registros antigos; contratos F8.1 usam quatro kinds explícitos.

### 6.2 Kinds suportados no código (`ImportKind`)

Definição: `fal-pecas/src/services/import/types.ts` + `contracts.ts`.

| Kind | Contrato (campos) | Apply RPC / service | Efeito principal |
|------|-------------------|---------------------|------------------|
| `catalog` | `sku`, `name`, opcional `grupo`, `montadora` | `apply_catalog_import` + enrichment client | Upsert produto por SKU; **não** PVC |
| `supplier_conversion` | `sku`, `supplier_sku` | `apply_supplier_conversion_import` | Upsert `supplier_products` por `(supplier_id, supplier_sku)` |
| `supplier_cost` | `supplier_sku`, `cost` | apply cost (migration F8.1-D) | Atualiza custo fornecedor |
| `price_list` | `sku`, `price` | `apply_price_list_import` | Preço na lista; **não** cria produto |

**Limites comuns:** `IMPORT_MAX_ROWS = 2000`; CSV/XLSX; validação estrutural em `validateImportGrid`; duplicata in-file configurável por kind.

### 6.3 Limitações específicas — `catalog`

| # | Limitação | Evidência |
|---|-----------|-----------|
| L1 | **Não cria** `product_vehicle_compatibility` | RPC F8.1-B/N comentário explícito; `adminCatalogImportService` |
| L2 | **Montadora → `attrs`**, não compatibilidade | Warning no preview: *“Montadora será gravada como sugestão (attrs) — sem compatibilidade veicular”* |
| L3 | **Grupo → categoria** só se `lower(name)` bater | Match exato por nome; sem árvore L3 automática (gap F8.7) |
| L4 | Novos produtos: `draft`, `is_available=false`, `price=0`, `is_incomplete=true` | RPC |
| L5 | Update existente: **não** altera `status`, `is_available`, `price`, PVC | RPC |
| L6 | Permissão apply: `administrador` \| `gerente` (`staff_can_import_catalog`) | SQL |
| L7 | Migration **preparada** `20261006130000_fase81n_catalog_grupo_montadora_prepared.sql` **não aplicada** no gate J–N | Enrichment grupo/montadora hoje **no client** pós-RPC |
| L8 | Sem kind `applications` / sem colunas veículo no contrato | `contracts.ts` |
| L9 | Match **exato** SKU; sem fuzzy/IA | Spec F8.1 D9 |
| L10 | `import_profiles` (migration M preparada) **não** no banco remoto — UI usa localStorage | `importProfiles.ts` |

### 6.4 Pipeline catálogo (resumo)

```text
Arquivo → parseCsv/parseXlsx → validateImportGrid
  → adminPreviewCatalogImport (lookup SKU)
  → imports + import_items (status preview)
  → apply_catalog_import (RPC: sku + name)
  → enrichCatalogImportExtras (client: category_id + attrs.montadora)
```

---

## 7. Recomendação única (Fase A)

### Decisão: **evoluir `product_vehicle_compatibility` (PVC)** — não criar tabela paralela de aplicações nesta fase

### Rationale (ordenado)

1. **Contrato de busca já é PVC-centric:** `search_products` parte de `product_vehicle_compatibility`; adicionar `year_start` / `year_end` na PVC minimiza entidades novas e mantém um único caminho de leitura pública.
2. **Decisão F3 explícita:** compatibilidade comercial vive na PVC apontando para `vehicle_versions.id`; criar `product_applications` separada repete o mesmo join lógico e obriga sincronização com admin/PDP.
3. **Import inteligente Fase A realista:** planilhas trazem SKU + veículo + **faixa de anos**; isso é metadado da **relação produto–veículo**, não do produto (`attrs.montadora_sugerida` continua só pista de classificação, conforme F8.7).
4. **Refinar `vehicle_versions` para “configuração”** (modelo + motor + versão, ano opcional ou deprecated) + faixa na PVC evita explosão de linhas VV (um registro por ano).
5. **Custo controlado:** uma migration PVC + alteração do RPC + extensão do admin “Aplicações” + novo kind ou extensão do pipeline de import — menor que duplicar stack RLS/UI.

### Escopo mínimo sugerido (não implementado nesta auditoria)

| Item | Descrição |
|------|-----------|
| DDL | `year_start int null`, `year_end int null` + CHECK + nova UNIQUE |
| Busca | Atualizar CTE `vehicle_product_ids` para faixa na PVC; manter NULL estrito documentado |
| Import Fase A | Novo kind `catalog_applications` **ou** segunda fase do wizard catálogo com match SKU → resolver VV → insert PVC `ON CONFLICT` |
| Não fazer | Auto-criar compatibilidade a partir de `montadora` do import catálogo atual |
| Backfill | Script §5 antes de dropar dependência de `vv.year` na busca |

### Quando reconsiderar tabela nova

- Necessidade de aplicações **sem** resolver `vehicle_version_id` (texto livre permanente).
- Múltiplas ontologias de veículo (OEM vs mercado vs placa) na mesma linha comercial.
- Equipe preferir **congelar** PVC legado e indexar só em tabela nova — aceitando período de dual-write.

---

## 8. Inventário de arquivos auditados

| Caminho | Papel |
|---------|--------|
| `supabase/migrations/20261003180000_fase2_schema_rls.sql` | DDL base veículos, PVC, products, imports |
| `supabase/migrations/20261003200000_fase3_schema_storage.sql` | `products.attrs`, grants |
| `supabase/migrations/20261003240000_fase4_search_products_rpc.sql` | RPC busca |
| `supabase/migrations/20261005120000_fase81b_catalog_import.sql` | RPC catálogo |
| `supabase/migrations/20261006130000_fase81n_catalog_grupo_montadora_prepared.sql` | RPC preparada (grupo/montadora) |
| `src/services/admin/adminProductService.ts` | PVC CRUD |
| `src/services/admin/adminCatalogImportService.ts` | Import catálogo |
| `src/services/import/contracts.ts` | Kinds e campos |
| `src/services/search/searchService.ts` | Cliente RPC |
| `src/services/vehicles/vehicleService.ts` | Árvore de filtros |
| `docs/planejamento/ESPECIFICACAO_FASE3_CATALOGO_COMERCIAL.md` | Regras NULL / aplicações |

---

## 9. Veredito

O sistema **já possui** todas as peças para compatibilidade veicular **manual** (admin + PVC + busca), mas **nenhum** import persiste aplicações. Ano e motor na busca vêm **exclusivamente** de `vehicle_versions` via join PVC. Para Import Inteligente Fase A, a evolução **menor risco / maior alinhamento** é **faixa de anos na PVC** + ajuste do RPC, mantendo montadora de planilha de catálogo **fora** da compatibilidade até validação explícita.

**Próximo passo sugerido (produto):** spec curta Fase A fixando regra de faixa (inclusiva/exclusiva), política de resolução/criação de `vehicle_versions` no import, e critérios de aceite de busca por ano.

---

*Auditoria read-only — gerada em 2026-10-07 a partir do estado local do repositório `fal-pecas`.*
