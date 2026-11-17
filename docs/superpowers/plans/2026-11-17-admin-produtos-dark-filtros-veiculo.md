# Admin Produtos — dark mode + filtros veículo — Plano

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Corrigir contraste dark na tela Admin Produtos (tema global + polish local) e permitir filtrar a lista por Modelo, Versão e Motor de forma independente da Montadora.

**Architecture:** Herança de cor/fundo no wrapper `.dark` + remap de `auth-link`; filtros de veículo estendem o lookup atual em `product_vehicle_compatibility` + `vehicle_versions` (mesmo espírito de `resolveVersionIds` em `adminApplicationService`); UI em `AdminProductsPage` com selects independentes e polish de tokens.

**Tech Stack:** React + Vite + Tailwind CSS v4 + Supabase JS + Vitest + TypeScript (`fal-pecas/`)

**Fontes:**

- Spec: [`docs/superpowers/specs/2026-11-17-admin-produtos-dark-filtros-veiculo-design.md`](../specs/2026-11-17-admin-produtos-dark-filtros-veiculo-design.md)

## Global Constraints

- Dark só no admin (classe `.dark` no shell); loja permanece light
- Navy/yellow de marca **não** invertem no dark
- Filtros de veículo são **independentes** (não exigir Montadora)
- Sem migration/RPC nova
- Sem redesign do painel “Alterações em lote”
- Commits: só se eFe pedir (nos steps “Commit”, preparar mensagem e aguardar)
- Responder e trabalhar em PT-BR

### Nota sobre commits

User rule: só criar commit quando pedido. Nos steps “Commit” abaixo: preparar `git add` + mensagem; **executar commit somente se eFe pedir**.

---

## Mapa de arquivos

| Arquivo | Responsabilidade |
|---------|------------------|
| `fal-pecas/src/styles/index.css` | Herança `.dark`, remap `auth-link`, base input/select |
| `fal-pecas/src/services/admin/adminProductService.ts` | Params + filtro veículo na listagem; helper puro exportado |
| `fal-pecas/src/services/admin/adminProductVehicleFilter.test.ts` | Unit tests do helper puro |
| `fal-pecas/src/services/admin/adminVehicleService.ts` | Helper distincts versão/motor (se necessário) |
| `fal-pecas/src/pages/admin/products/AdminProductsPage.tsx` | Selects + polish tabela/botões/banner |

---

### Task 1: Tema dark global (herança + auth-link + inputs)

**Files:**

- Modify: `fal-pecas/src/styles/index.css`

**Interfaces:**

- Produces: `.dark` com `color`/`background-color` herdáveis; `--fal-auth-link` e `--color-fal-auth-link` no dark; `input`/`select` com tokens FAL no `@layer base`

- [ ] **Step 1: Atualizar bloco `.dark`**

Em `fal-pecas/src/styles/index.css`, no bloco `.dark` existente, garantir:

```css
.dark {
  --fal-accent: #60a5fa;
  --fal-accent-hover: #3b82f6;
  --fal-warning: #fbbf24;
  --fal-favorite: #fb7185;
  --fal-fg: #f3f5f7;
  --fal-bg: #0e1116;
  --fal-surface: #181c22;
  --fal-surface-2: #222831;
  --fal-line: #2e3640;
  --fal-muted: #a8b0b8;
  --fal-success: #34d399;
  --fal-danger: #f87171;
  --fal-auth-link: #f2c84b;

  color: var(--fal-fg);
  background-color: var(--fal-bg);

  --color-fal-accent: var(--fal-accent);
  --color-fal-accent-hover: var(--fal-accent-hover);
  --color-fal-warning: var(--fal-warning);
  --color-fal-favorite: var(--fal-favorite);
  --color-fal-fg: var(--fal-fg);
  --color-fal-ink: var(--fal-fg);
  --color-fal-bg: var(--fal-bg);
  --color-fal-surface: var(--fal-surface);
  --color-fal-surface-2: var(--fal-surface-2);
  --color-fal-line: var(--fal-line);
  --color-fal-muted: var(--fal-muted);
  --color-fal-success: var(--fal-success);
  --color-fal-danger: var(--fal-danger);
  --color-fal-auth-link: var(--fal-auth-link);
}
```

- [ ] **Step 2: Base input/select com tokens**

Dentro de `@layer base`, ajustar o bloco `button, input, select`:

```css
  button,
  input,
  select {
    font: inherit;
  }

  input,
  select {
    color: var(--fal-fg);
    background-color: var(--fal-surface);
  }
```

- [ ] **Step 3: Verificar visual rápido**

Rodar `npm run dev` em `fal-pecas/`, abrir `/admin/produtos` com tema dark: texto da página (fora da tabela) deve herdar claro; link “Editar” deve ficar âmbar/amarelo legível.

- [ ] **Step 4: Commit (só se eFe pedir)**

```bash
git add fal-pecas/src/styles/index.css
git commit -m "$(cat <<'EOF'
fix(admin): herança de cor no .dark e auth-link legível

EOF
)"
```

---

### Task 2: Helper puro + filtro veículo no service

**Files:**

- Modify: `fal-pecas/src/services/admin/adminProductService.ts`
- Create: `fal-pecas/src/services/admin/adminProductVehicleFilter.test.ts`

**Interfaces:**

- Consumes: `getSupabase()`, tabela `product_vehicle_compatibility` + `vehicle_versions`
- Produces:
  - `AdminProductVehicleFilter = { manufacturerId?: string; modelId?: string; versionName?: string; engine?: string }`
  - `export function hasAdminProductVehicleFilter(f: AdminProductVehicleFilter): boolean`
  - `AdminProductListParams` inclui `modelId?`, `versionName?`, `engine?`
  - `adminListProductsPage` restringe por compatibilidade quando qualquer campo de veículo está setado

- [ ] **Step 1: Escrever testes que falham**

Criar `fal-pecas/src/services/admin/adminProductVehicleFilter.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { hasAdminProductVehicleFilter } from '@/services/admin/adminProductService'

describe('hasAdminProductVehicleFilter', () => {
  it('false quando tudo vazio', () => {
    expect(hasAdminProductVehicleFilter({})).toBe(false)
    expect(hasAdminProductVehicleFilter({ manufacturerId: '', modelId: '' })).toBe(false)
  })

  it('true com montadora, modelo, versão ou motor', () => {
    expect(hasAdminProductVehicleFilter({ manufacturerId: 'm1' })).toBe(true)
    expect(hasAdminProductVehicleFilter({ modelId: 'mod1' })).toBe(true)
    expect(hasAdminProductVehicleFilter({ versionName: 'Comfortline' })).toBe(true)
    expect(hasAdminProductVehicleFilter({ engine: '1.0' })).toBe(true)
  })

  it('ignora whitespace em versão/motor', () => {
    expect(hasAdminProductVehicleFilter({ versionName: '  ' })).toBe(false)
    expect(hasAdminProductVehicleFilter({ engine: ' 1.0 ' })).toBe(true)
  })
})
```

- [ ] **Step 2: Rodar teste e confirmar falha**

Run (em `fal-pecas/`):

```bash
npm test -- src/services/admin/adminProductVehicleFilter.test.ts
```

Expected: FAIL (export `hasAdminProductVehicleFilter` inexistente)

- [ ] **Step 3: Implementar helper + params + query**

Em `adminProductService.ts`, próximo de `AdminProductListParams`:

```ts
export type AdminProductVehicleFilter = {
  manufacturerId?: string
  modelId?: string
  versionName?: string
  engine?: string
}

export function hasAdminProductVehicleFilter(f: AdminProductVehicleFilter): boolean {
  return Boolean(
    f.manufacturerId?.trim() ||
      f.modelId?.trim() ||
      f.versionName?.trim() ||
      f.engine?.trim(),
  )
}
```

Estender `AdminProductListParams`:

```ts
  manufacturerId?: string
  modelId?: string
  versionName?: string
  engine?: string
```

Substituir o bloco atual que só trata `manufacturerId` em `adminListProductsPage` por:

```ts
  let productIdsByVehicle: string[] | null = null
  const vehicleFilter: AdminProductVehicleFilter = {
    manufacturerId: params?.manufacturerId,
    modelId: params?.modelId,
    versionName: params?.versionName,
    engine: params?.engine,
  }
  if (hasAdminProductVehicleFilter(vehicleFilter)) {
    let compat = getSupabase()
      .from('product_vehicle_compatibility')
      .select('product_id, vehicle_versions!inner(manufacturer_id, model_id, version_name, engine)')
    if (vehicleFilter.manufacturerId?.trim()) {
      compat = compat.eq(
        'vehicle_versions.manufacturer_id',
        vehicleFilter.manufacturerId.trim(),
      )
    }
    if (vehicleFilter.modelId?.trim()) {
      compat = compat.eq('vehicle_versions.model_id', vehicleFilter.modelId.trim())
    }
    if (vehicleFilter.versionName?.trim()) {
      compat = compat.ilike(
        'vehicle_versions.version_name',
        vehicleFilter.versionName.trim(),
      )
    }
    if (vehicleFilter.engine?.trim()) {
      compat = compat.ilike('vehicle_versions.engine', vehicleFilter.engine.trim())
    }
    const { data: compatRows, error: compatErr } = await compat
    if (compatErr) throw compatErr
    productIdsByVehicle = [
      ...new Set(
        (compatRows ?? []).map((r) => String((r as { product_id: string }).product_id)),
      ),
    ]
    if (productIdsByVehicle.length === 0) return { items: [], hasMore: false }
  }
  // ...
  if (productIdsByVehicle) q = q.in('id', productIdsByVehicle)
```

Remover a variável antiga `productIdsByMaker` / branch só-montadora.

- [ ] **Step 4: Rodar testes**

```bash
npm test -- src/services/admin/adminProductVehicleFilter.test.ts
```

Expected: PASS

- [ ] **Step 5: Commit (só se eFe pedir)**

```bash
git add fal-pecas/src/services/admin/adminProductService.ts fal-pecas/src/services/admin/adminProductVehicleFilter.test.ts
git commit -m "$(cat <<'EOF'
feat(admin): filtrar produtos por modelo, versão e motor

EOF
)"
```

---

### Task 3: Distincts de versão/motor (opções dos selects)

**Files:**

- Modify: `fal-pecas/src/services/admin/adminVehicleService.ts`

**Interfaces:**

- Consumes: tabela `vehicle_versions`, `adminListModels` (já existe)
- Produces:
  - `adminListDistinctVersionNames(filter?: { manufacturerId?: string; modelId?: string }): Promise<string[]>`
  - `adminListDistinctEngines(filter?: { manufacturerId?: string; modelId?: string }): Promise<string[]>`

- [ ] **Step 1: Adicionar funções de distinct**

Em `adminVehicleService.ts`:

```ts
export async function adminListDistinctVersionNames(filter?: {
  manufacturerId?: string
  modelId?: string
}): Promise<string[]> {
  let q = getSupabase()
    .from('vehicle_versions')
    .select('version_name')
    .not('version_name', 'is', null)
    .order('version_name')
  if (filter?.manufacturerId) q = q.eq('manufacturer_id', filter.manufacturerId)
  if (filter?.modelId) q = q.eq('model_id', filter.modelId)
  const { data, error } = await q
  if (error) throw error
  return [
    ...new Set(
      (data ?? [])
        .map((r) => String((r as { version_name: string | null }).version_name ?? '').trim())
        .filter(Boolean),
    ),
  ].sort((a, b) => a.localeCompare(b, 'pt-BR'))
}

export async function adminListDistinctEngines(filter?: {
  manufacturerId?: string
  modelId?: string
}): Promise<string[]> {
  let q = getSupabase()
    .from('vehicle_versions')
    .select('engine')
    .not('engine', 'is', null)
    .order('engine')
  if (filter?.manufacturerId) q = q.eq('manufacturer_id', filter.manufacturerId)
  if (filter?.modelId) q = q.eq('model_id', filter.modelId)
  const { data, error } = await q
  if (error) throw error
  return [
    ...new Set(
      (data ?? [])
        .map((r) => String((r as { engine: string | null }).engine ?? '').trim())
        .filter(Boolean),
    ),
  ].sort((a, b) => a.localeCompare(b, 'pt-BR'))
}
```

- [ ] **Step 2: Smoke manual via console/dev** — chamar as funções após login admin e confirmar arrays não vazios no ambiente com dados.

- [ ] **Step 3: Commit (só se eFe pedir)**

```bash
git add fal-pecas/src/services/admin/adminVehicleService.ts
git commit -m "$(cat <<'EOF'
feat(admin): distincts de versão e motor para filtros

EOF
)"
```

---

### Task 4: UI AdminProductsPage — filtros + polish dark

**Files:**

- Modify: `fal-pecas/src/pages/admin/products/AdminProductsPage.tsx`

**Interfaces:**

- Consumes: `adminListModels`, `adminListDistinctVersionNames`, `adminListDistinctEngines`, `adminListProductsPage` com novos params
- Produces: selects Modelo/Versão/Motor; tabela/cards com tokens legíveis no dark

- [ ] **Step 1: Estado, carga de opções e listParams**

Adicionar estados:

```ts
const [modelId, setModelId] = useState('')
const [versionName, setVersionName] = useState('')
const [engine, setEngine] = useState('')
const [models, setModels] = useState<VehicleModel[]>([])
const [versionOptions, setVersionOptions] = useState<string[]>([])
const [engineOptions, setEngineOptions] = useState<string[]>([])
```

Imports: `adminListModels`, `adminListDistinctVersionNames`, `adminListDistinctEngines` de `@/services/admin/adminVehicleService`; tipo `VehicleModel` de `@/types`.

No `useEffect` inicial (junto a categories/manufacturers), **não** bloquear a lista de produtos: carregar makers como hoje.

Novo `useEffect` para opções dependentes:

```ts
useEffect(() => {
  void (async () => {
    try {
      const [mods, vers, engs] = await Promise.all([
        adminListModels(manufacturerId || undefined),
        adminListDistinctVersionNames({
          manufacturerId: manufacturerId || undefined,
          modelId: modelId || undefined,
        }),
        adminListDistinctEngines({
          manufacturerId: manufacturerId || undefined,
          modelId: modelId || undefined,
        }),
      ])
      setModels(mods)
      setVersionOptions(vers)
      setEngineOptions(engs)
    } catch (e) {
      pushError(toUserMessage(e, 'Erro ao carregar filtros de veículo'))
    }
  })()
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [manufacturerId, modelId])
```

Estender `listParams` / `reload` / `clearFilters` com `modelId`, `versionName`, `engine` (mesmo padrão de `manufacturerId`). Em `clearFilters`, zerar os três. No botão Limpar, passar overrides vazios desses campos.

- [ ] **Step 2: Selects no formulário**

Após o select Montadora, adicionar (classes padronizadas):

```tsx
const selectCls =
  'w-full rounded-[9px] border border-fal-line bg-fal-surface px-2 py-2.5 text-fal-fg'

{/* Montadora — atualizar className para selectCls */}
<label className="block text-sm">
  <span className="mb-1 block text-xs font-extrabold text-fal-muted">Modelo</span>
  <select
    className={selectCls}
    value={modelId}
    onChange={(e) => {
      setModelId(e.target.value)
      setVersionName('')
      setEngine('')
    }}
  >
    <option value="">Todos</option>
    {models.map((m) => (
      <option key={m.id} value={m.id}>
        {m.name}
      </option>
    ))}
  </select>
</label>
<label className="block text-sm">
  <span className="mb-1 block text-xs font-extrabold text-fal-muted">Versão</span>
  <select
    className={selectCls}
    value={versionName}
    onChange={(e) => setVersionName(e.target.value)}
  >
    <option value="">Todas</option>
    {versionOptions.map((v) => (
      <option key={v} value={v}>
        {v}
      </option>
    ))}
  </select>
</label>
<label className="block text-sm">
  <span className="mb-1 block text-xs font-extrabold text-fal-muted">Motor</span>
  <select
    className={selectCls}
    value={engine}
    onChange={(e) => setEngine(e.target.value)}
  >
    <option value="">Todos</option>
    {engineOptions.map((eng) => (
      <option key={eng} value={eng}>
        {eng}
      </option>
    ))}
  </select>
</label>
```

Ajustar o `grid` do formulário para acomodar os campos extras, por exemplo:

```tsx
className="grid grid-cols-1 items-end gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
```

(Manter Buscar/Limpar e checkbox Sem imagem no fluxo; Status/Estoque/Montadora/Modelo/Versão/Motor na grade.)

Nota: limpar versão/motor ao mudar modelo **só limpa UI de opções** — ainda permite setar versão/motor sem montadora (filtros independentes). Não desabilitar selects.

- [ ] **Step 3: Polish tabela / cards / banner**

Tabela desktop (`tbody`):

```tsx
<td className="px-3 py-2 font-mono text-xs text-fal-fg">{p.commercialRef ?? p.sku}</td>
<td className="px-3 py-2 font-semibold text-fal-fg">…</td>
<td className="px-3 py-2 text-fal-fg">{productStatusLabel(p.status)}</td>
<td className="px-3 py-2">
  {p.available ? (
    <span className="font-semibold text-fal-success">Disponível</span>
  ) : (
    <span className="text-fal-muted">Indisponível</span>
  )}
</td>
<td className="px-3 py-2 text-fal-fg">
  {p.price.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
</td>
```

Mobile: trocar `text-emerald-800` por `text-fal-success`; botão Editar:

```tsx
<Link
  className="inline-flex min-h-11 items-center rounded-[10px] bg-fal-yellow px-3 text-sm font-bold text-fal-navy-dark"
  to={`/admin/produtos/${p.id}`}
>
  Editar
</Link>
```

Banner “carregar mais”:

```tsx
<p className="rounded-[10px] border border-fal-warning/40 bg-fal-warning/10 px-3 py-2 text-sm text-fal-fg">
```

Aplicar `selectCls` também em Status, Estoque, Medidas e Montadora.

- [ ] **Step 4: Verificação manual**

1. Dark: tabela legível (código/nome/preço/status), “Disponível” verde token, “Editar” âmbar, banner ok.
2. Light: sem regressão óbvia.
3. Filtrar só Motor → lista restringe; só Modelo; Montadora+Modelo; Limpar restaura.
4. `npm test -- src/services/admin/adminProductVehicleFilter.test.ts` ainda PASS.

- [ ] **Step 5: Commit (só se eFe pedir)**

```bash
git add fal-pecas/src/pages/admin/products/AdminProductsPage.tsx
git commit -m "$(cat <<'EOF'
feat(admin): filtros veículo e contraste na lista de produtos

EOF
)"
```

---

## Self-review do plano

| Spec | Task |
|------|------|
| Herança `.dark` + auth-link + input/select | Task 1 |
| Params + query compatibilidade multi-campo | Task 2 |
| Distincts versão/motor | Task 3 |
| UI selects independentes + polish tabela/botões/banner | Task 4 |
| Testes helper puro | Task 2 |
| Sem RPC / sem cascata obrigatória / sem lote | respeitado |

Sem placeholders TBD. Assinaturas `hasAdminProductVehicleFilter` / distincts consistentes entre tasks.
