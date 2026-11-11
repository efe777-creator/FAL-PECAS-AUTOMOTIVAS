# Busca Inteligente P0 — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fazer a busca textual (`HB20 2015`, `terminal HB20 1.0 2015`, códigos) usar o mesmo motor PVC do seletor manual, sem IA.

**Architecture:** Interpretador determinístico `interpretSearchQuery` extrai veículo/ano/motor/versão/código do texto; `SearchBar`/`CatalogPage`/`searchCatalog` passam `maker/model/year/engine/version` + `q` residual para a RPC `search_products` já existente. Compatibilidade continua 100% em `product_vehicle_compatibility`.

**Tech Stack:** React 19 + TypeScript + Vite + Vitest + Supabase RPC `search_products`

**Master plan:** [`docs/planejamento/FAL_PLANO_BUSCA_INTELIGENTE_V1_2026-11-11.md`](../../planejamento/FAL_PLANO_BUSCA_INTELIGENTE_V1_2026-11-11.md)  
**Design:** [`docs/superpowers/specs/2026-11-11-busca-inteligente-design.md`](../specs/2026-11-11-busca-inteligente-design.md)

## Global Constraints

- Não inventar compatibilidade fora do PVC.
- Não chamar API de IA nesta fase.
- Não alterar regras de preço.
- Preservar seletor YMM e URLs `maker/model/year/...` existentes.
- Commits só quando o eFe pedir (ou ao final de task se autorizado).
- Copy e testes em pt-BR quando forem UI.
- Rodar testes em `fal-pecas/` com `pnpm test` / `pnpm exec vitest`.

## File map

| Arquivo | Papel |
|---------|--------|
| `fal-pecas/src/services/search/interpretSearchQuery.ts` | **Criar** — parser puro |
| `fal-pecas/src/services/search/interpretSearchQuery.test.ts` | **Criar** — TDD |
| `fal-pecas/src/services/search/buildCatalogSearchParams.ts` | **Criar** — intent → ProductSearchParams + URLSearchParams |
| `fal-pecas/src/services/search/buildCatalogSearchParams.test.ts` | **Criar** |
| `fal-pecas/src/services/search/searchService.ts` | **Modificar** — opcionalmente interpretar se `q` vier sem vehicle params |
| `fal-pecas/src/components/navigation/SearchBar.tsx` | **Modificar** — navegar com params unificados |
| `fal-pecas/src/pages/Catalog/CatalogPage.tsx` | **Modificar** — empty state veículo reconhecido |
| `fal-pecas/src/types/index.ts` | **Modificar** — tipo `SearchIntent` se ainda não existir |
| `fal-pecas/src/services/vehicles/vehicleService.ts` | **Ler/usar** — lista models/makers para matching (cache leve) |

---

### Task 1: Tipo `SearchIntent` + testes falhando do parser

**Files:**
- Create: `fal-pecas/src/services/search/interpretSearchQuery.ts`
- Create: `fal-pecas/src/services/search/interpretSearchQuery.test.ts`
- Modify: `fal-pecas/src/types/index.ts` (export do tipo se o projeto tipa em `types`)

**Interfaces:**
- Consumes: lista opcional de `{ maker: string; model: string }` para matching
- Produces: `interpretSearchQuery(raw, catalog): SearchIntent`

- [ ] **Step 1: Adicionar tipo e stub**

```ts
// fal-pecas/src/services/search/interpretSearchQuery.ts
export type SearchIntentVehicle = {
  maker?: string
  model?: string
  year?: string
  engine?: string
  version?: string
}

export type SearchIntent = {
  raw: string
  productQuery: string | null
  vehicle: SearchIntentVehicle
  codeHint?: string
  needsClarification: boolean
  clarification?: 'engine' | 'version' | 'year' | 'model'
  confidence: 'high' | 'medium' | 'low'
}

export type VehicleCatalogEntry = { maker: string; model: string }

export function interpretSearchQuery(
  raw: string,
  catalog: VehicleCatalogEntry[] = [],
): SearchIntent {
  throw new Error('not implemented')
}
```

- [ ] **Step 2: Escrever testes Vitest (casos TinyFish + brief)**

```ts
import { describe, expect, it } from 'vitest'
import { interpretSearchQuery } from './interpretSearchQuery'

const catalog = [
  { maker: 'Hyundai', model: 'HB20' },
  { maker: 'Fiat', model: 'Palio' },
]

describe('interpretSearchQuery', () => {
  it('HB20 2015 → model+year, sem productQuery', () => {
    const i = interpretSearchQuery('HB20 2015', catalog)
    expect(i.vehicle.model).toBe('HB20')
    expect(i.vehicle.maker).toBe('Hyundai')
    expect(i.vehicle.year).toBe('2015')
    expect(i.productQuery).toBeNull()
  })

  it('HB20 1.0 2015 → engine', () => {
    const i = interpretSearchQuery('HB20 1.0 2015', catalog)
    expect(i.vehicle.engine).toBe('1.0')
    expect(i.vehicle.year).toBe('2015')
  })

  it('terminal HB20 2015 → productQuery + vehicle', () => {
    const i = interpretSearchQuery('terminal HB20 2015', catalog)
    expect(i.productQuery?.toLowerCase()).toContain('terminal')
    expect(i.vehicle.model).toBe('HB20')
    expect(i.vehicle.year).toBe('2015')
  })

  it('TDI2116 → codeHint prioritário', () => {
    const i = interpretSearchQuery('TDI2116', catalog)
    expect(i.codeHint).toBe('TDI2116')
    expect(i.productQuery).toBe('TDI2116')
  })

  it('não trata 2015 como ano sem modelo', () => {
    const i = interpretSearchQuery('oleo 2015', catalog)
    expect(i.vehicle.year).toBeUndefined()
  })
})
```

- [ ] **Step 3: Rodar testes — devem falhar**

```bash
pnpm -C fal-pecas exec vitest run src/services/search/interpretSearchQuery.test.ts
```

Expected: FAIL (`not implemented` ou asserts).

- [ ] **Step 4: Implementar parser mínimo**

Regras (implementar nesta ordem no arquivo):

1. Normalizar: NFD, lower para match; preservar raw.
2. Detectar código: token `^[A-Za-z]{2,}\d{3,}$` ou similar → `codeHint` + `productQuery`.
3. Detectar ano: `\b(19|20)\d{2}\b` **somente se** modelo casado no catálogo.
4. Detectar motor: `\b\d\.\d\b`.
5. Match modelo: token/frase contra `catalog` por `normalizeEntityMatchKey` (reusar `@/lib/entityNormalize`).
6. Remover tokens consumidos; resto → `productQuery` (join) ou `null`.
7. `confidence: 'high'` se model+year; `'medium'` se só model.

Usar `normalizeEntityMatchKey` de `fal-pecas/src/lib/entityNormalize.ts` para HB20/Hb20.

- [ ] **Step 5: Rodar testes — devem passar**

```bash
pnpm -C fal-pecas exec vitest run src/services/search/interpretSearchQuery.test.ts
```

Expected: PASS

- [ ] **Step 6: Commit (somente se eFe autorizar)**

```bash
git add fal-pecas/src/services/search/interpretSearchQuery.ts fal-pecas/src/services/search/interpretSearchQuery.test.ts
git commit -m "feat(search): interpretador determinístico de query veicular (P0)"
```

---

### Task 2: Intent → URL / ProductSearchParams

**Files:**
- Create: `fal-pecas/src/services/search/buildCatalogSearchParams.ts`
- Create: `fal-pecas/src/services/search/buildCatalogSearchParams.test.ts`

**Interfaces:**
- Consumes: `SearchIntent`
- Produces: `{ searchParams: URLSearchParams; catalogParams: ProductSearchParams }`

- [ ] **Step 1: Teste**

```ts
import { describe, expect, it } from 'vitest'
import { interpretSearchQuery } from './interpretSearchQuery'
import { buildCatalogSearchParams } from './buildCatalogSearchParams'

const catalog = [{ maker: 'Hyundai', model: 'HB20' }]

it('HB20 2015 vira model+year sem q poluído', () => {
  const intent = interpretSearchQuery('HB20 2015', catalog)
  const { searchParams, catalogParams } = buildCatalogSearchParams(intent)
  expect(searchParams.get('model')).toBe('HB20')
  expect(searchParams.get('year')).toBe('2015')
  expect(searchParams.get('maker')).toBe('Hyundai')
  expect(searchParams.get('q')).toBeNull()
  expect(catalogParams.model).toBe('HB20')
  expect(catalogParams.year).toBe('2015')
  expect(catalogParams.q).toBeUndefined()
})
```

- [ ] **Step 2: Implementar**

```ts
import type { ProductSearchParams } from '@/types'
import type { SearchIntent } from './interpretSearchQuery'

export function buildCatalogSearchParams(intent: SearchIntent): {
  searchParams: URLSearchParams
  catalogParams: ProductSearchParams
} {
  const sp = new URLSearchParams()
  const catalogParams: ProductSearchParams = {}

  const q = intent.codeHint ?? intent.productQuery
  if (q) {
    sp.set('q', q)
    catalogParams.q = q
  }
  const v = intent.vehicle
  if (v.maker) {
    sp.set('maker', v.maker)
    catalogParams.maker = v.maker
  }
  if (v.model) {
    sp.set('model', v.model)
    catalogParams.model = v.model
  }
  if (v.year) {
    sp.set('year', v.year)
    catalogParams.year = v.year
  }
  if (v.engine) {
    sp.set('engine', v.engine)
    catalogParams.engine = v.engine
  }
  if (v.version) {
    sp.set('version', v.version)
    catalogParams.version = v.version
  }
  if (v.maker || v.model || v.year) sp.set('vehicle', '1')

  return { searchParams: sp, catalogParams }
}
```

- [ ] **Step 3: Vitest PASS**

```bash
pnpm -C fal-pecas exec vitest run src/services/search/buildCatalogSearchParams.test.ts
```

---

### Task 3: SearchBar navega com params unificados

**Files:**
- Modify: `fal-pecas/src/components/navigation/SearchBar.tsx`
- Modify: hook ou service que carrega catálogo leve de veículos para o parser

**Interfaces:**
- Consumes: `interpretSearchQuery`, `buildCatalogSearchParams`, lista makers/models (via `getVehicleOptions` ou query `models`+`manufacturers`)
- Produces: navegação `/catalogo?...` com maker/model/year quando aplicável

- [ ] **Step 1: Carregar catálogo de modelos para match**

Preferência: reutilizar dados já cacheados de `getVehicleOptions()` **ou** criar `listVehicleCatalogEntries()` em `vehicleService.ts` que retorna `{maker, model}[]` distinct active — sem inventar tabela nova.

- [ ] **Step 2: Trocar `goCatalog`**

De:

```ts
navigate(`/catalogo?q=${encodeURIComponent(qTrim)}`)
```

Para:

```ts
const intent = interpretSearchQuery(qTrim, vehicleCatalog)
const { searchParams } = buildCatalogSearchParams(intent)
navigate(`/catalogo?${searchParams.toString()}`)
```

- [ ] **Step 3: Smoke manual / browser**

Casos: `HB20 2015`, `HB20`, `TDI2116`, `terminal HB20 2015`.

Expected: URL contém `model=HB20&year=2015` no primeiro caso; total ≈ seletor.

- [ ] **Step 4: Commit se autorizado**

```bash
git commit -m "fix(search): SearchBar envia filtros veículo parseados na URL"
```

---

### Task 4: Defesa em profundidade no `searchCatalog`

**Files:**
- Modify: `fal-pecas/src/services/search/searchService.ts`

**Por quê:** formulário do catálogo e links antigos ainda podem mandar só `q=HB20 2015`.

- [ ] **Step 1: Se `params.q` presente e `maker/model/year` todos vazios, interpretar antes do RPC**

```ts
let effective = { ...params }
if (params.q?.trim() && !params.maker && !params.model && !params.year) {
  const intent = interpretSearchQuery(params.q, vehicleCatalog)
  const { catalogParams } = buildCatalogSearchParams(intent)
  effective = { ...params, ...catalogParams }
}
const qPrepared = await prepareSearchQuery(effective.q)
// rpc com effective.maker/model/year...
```

- [ ] **Step 2: Garantir que `prepareSearchQuery` rode só no `productQuery` residual** (não reexpandir tokens de veículo já removidos).

- [ ] **Step 3: Teste de integração mock ou teste unitário do merge** (se houver harness); senão VAL manual documentado.

---

### Task 5: Empty state — veículo reconhecido sem peças

**Files:**
- Modify: `fal-pecas/src/pages/Catalog/CatalogPage.tsx` (bloco EmptyState)

- [ ] **Step 1: Detectar intent na URL** (`model` set, `total === 0`)

Copy:

- Veículo reconhecido sem apps: **“Nenhuma peça compatível cadastrada para este veículo.”** + CTA seletor/refinar.
- Query sem veículo: manter empty atual de busca.

- [ ] **Step 2: Visual check mobile/desktop**

---

### Task 6: Validação SQL produção (read-only) + VAL

**Files:**
- Create: `docs/planejamento/FAL_MARCHA_BUSCA_P0_INTERPRETER_VAL_2026-11-11.md` (data real do dia do VAL)
- Create: script opcional `fal-pecas/scripts/audit-search-hb20.sql`

- [ ] **Step 1: Rodar SQL A–C do plano mestre no projeto Supabase publicado**

Confirmar PVC dos 3 SKUs contém 2015 no intervalo.

- [ ] **Step 2: Matriz T01–T06, T09 no site (local apontando prod ou preview)**

Preencher tabela resultado esperado vs obtido.

- [ ] **Step 3: Gate eFe** — autorizar P1 ou pedir ajuste.

---

### Task 7 (P0 dados, paralelo): Auditoria períodos HB20

**Files:**
- Update: `FAL_AUDITORIA_VEICULOS_APLICACOES_V1.md` / CSV inconsistências

- [ ] **Step 1: Listar PVC onde model HB20 e year_start/end**

- [ ] **Step 2: Marcar linhas com período suspeito (fim nulo ok; início absurdo não)**

- [ ] **Step 3: Correção só via admin/import — **não** SQL ad-hoc em prod sem aprovação**

---

## Fora deste plano P0 (próximos planos)

- Autocomplete seccionado (P1) — plano separado após VAL P0.
- IA NL (P2).
- Relabel `12/...` → `2012–atual` (decisão UX).
- Indexar maker/model em `search_document`.

## Self-review

| Requisito brief | Task |
|-----------------|------|
| HB20 2015 encontra produtos | 1–4, 6 |
| Unificar texto e filtro | 2–4 |
| Auditar períodos | 7 |
| Veículo sem produtos diferenciado | 5 |
| IA | Fora (P2) |
| Autocomplete veículos | Fora (P1) |
