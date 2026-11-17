# UI cores / identidade / dark admin / Overview — Plano tático

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Entregar tokens FAL expandidos, dark admin com toggle, chrome (ativo accent + tabs), Dashboard Overview, favorito vermelho e copy/hierarquia alinhados — sem perder identidade navy+amarelo.

**Architecture:** Tokens semânticos em `index.css` (+ `@custom-variant dark`); tema admin via classe `.dark` no shell `AdminLayout` + `localStorage`; componentes `AdminThemeToggle` e `AdminTabs`; Dashboard repaginado com dados existentes; microajustes loja (favorito/copy) herdando tokens.

**Tech Stack:** React + Vite + Tailwind CSS v4 + React Router + TypeScript (`fal-pecas/`)

**Fontes:**

- Auditoria: [`docs/planejamento/FAL_AUDITORIA_UI_CORES_IDENTIDADE_2026-11-16.md`](../../planejamento/FAL_AUDITORIA_UI_CORES_IDENTIDADE_2026-11-16.md)
- Spec: [`docs/superpowers/specs/2026-11-16-ui-cores-identidade-design.md`](../specs/2026-11-16-ui-cores-identidade-design.md)
- Identidade: [`docs/entrada/IDENTIDADE_VISUAL.md`](../../entrada/IDENTIDADE_VISUAL.md)

## Global Constraints

- Não alterar cores do arquivo de logo
- Primary button permanece amarelo FAL
- Ativo de menu/aba = `fal-accent` (azul), nunca amarelo
- Dark só no admin nesta onda; loja clara
- Favorito liked = vermelho (`fal-favorite`)
- Não inventar métricas sem backend
- Não mover filas de expedição para Logística
- Máx. ~3 acentos coloridos por viewport
- Commits pequenos e frequentes; só commit se eFe pedir (regra do user) — nos steps de commit, preparar mensagem e aguardar pedido explícito se a regra de commit estiver ativa
- Responder e trabalhar em PT-BR

### Nota sobre commits

User rule: só criar commit quando pedido. Nos steps “Commit” abaixo: preparar `git add` + mensagem; **executar commit somente se eFe pedir**.

---

## Mapa de arquivos

| Arquivo | Responsabilidade |
|---------|------------------|
| `fal-pecas/src/styles/index.css` | Tokens light/dark, `@custom-variant dark`, `@theme` |
| `fal-pecas/src/components/admin/AdminThemeToggle.tsx` | Botão liga/desliga tema |
| `fal-pecas/src/lib/adminTheme.ts` | Ler/gravar `fal-admin-theme`, aplicar classe |
| `fal-pecas/src/components/admin/AdminLayout.tsx` | Shell `.dark`, toggle, ativo accent, link Busca |
| `fal-pecas/src/components/admin/AdminTabs.tsx` | Abas unificadas |
| `fal-pecas/src/pages/admin/home/AdminHomeSectionTabs.tsx` | Consumir AdminTabs |
| `fal-pecas/src/pages/admin/AdminDashboardPage.tsx` | Overview |
| `fal-pecas/src/components/product/ProductCard.tsx` | Favorito vermelho |
| `fal-pecas/src/pages/Product/ProductPage.tsx` | Favorito vermelho |
| `fal-pecas/src/lib/adminBreadcrumbs.ts` | Labels faltantes |
| `docs/entrada/IDENTIDADE_VISUAL.md` | Registrar tokens novos após validação |

---

### Task 1: Tokens + dark variant

**Files:**

- Modify: `fal-pecas/src/styles/index.css`
- Modify: `docs/entrada/IDENTIDADE_VISUAL.md` (seção cores — após validação visual)

**Interfaces:**

- Produces: CSS vars `--fal-accent`, `--fal-warning`, `--fal-favorite`, `--fal-fg`, pares dark sob `.dark`; utilities Tailwind `bg-fal-surface`, `text-fal-accent`, etc.

- [ ] **Step 1: Confirmar Tailwind v4 dark class strategy no CSS**

No topo de `index.css` (após `@import 'tailwindcss'`), garantir:

```css
@custom-variant dark (&:where(.dark, .dark *));
```

- [ ] **Step 2: Expandir `:root` e `@theme`**

Adicionar (valores sugeridos — calibrar contraste no Step 4):

```css
:root {
  /* existentes… */
  --fal-accent: #3b82f6;
  --fal-accent-hover: #2563eb;
  --fal-warning: #d97706;
  --fal-favorite: #e11d48;
  --fal-fg: #252c36;
}

@theme {
  /* existentes… */
  --color-fal-accent: #3b82f6;
  --color-fal-accent-hover: #2563eb;
  --color-fal-warning: #d97706;
  --color-fal-favorite: #e11d48;
  --color-fal-fg: #252c36;
}
```

- [ ] **Step 3: Pares dark**

```css
.dark {
  --fal-bg: #1a1f26;
  --fal-surface: #242b33;
  --fal-line: #3a4450;
  --fal-muted: #9aa3ad;
  --fal-fg: #e8ecf0;
  --fal-navy: #e8ecf0;
  --fal-navy-dark: #f4f6f7;
  --fal-navy-2: #c5cbd1;
  /* yellow / accent / favorite / success / danger: manter com contraste AA */
}
```

Espelhar no `@theme` via as mesmas vars (utilities leem `--color-fal-*`; se o projeto mapeia `@theme` estático, preferir redefinir as custom properties `--fal-*` usadas em `var()` e classes `bg-fal-*` já ligadas ao `@theme` — se `bg-fal-bg` não reagir a `.dark`, usar padrão:

```css
.dark {
  --color-fal-bg: #1a1f26;
  --color-fal-surface: #242b33;
  --color-fal-line: #3a4450;
  --color-fal-muted: #9aa3ad;
  --color-fal-fg: #e8ecf0;
  --color-fal-navy: #e8ecf0;
  --color-fal-navy-dark: #f4f6f7;
  --color-fal-navy-2: #c5cbd1;
}
```

- [ ] **Step 4: Smoke visual local**

Run: `cd fal-pecas && npm run dev`  
Abrir `/admin`, forçar `<html class="dark">` ou classe no shell (Task 2) e checar contraste amarelo/accent/favorito.

- [ ] **Step 5: Atualizar tabela de cores em IDENTIDADE_VISUAL.md** com tokens novos + nota dark admin-only.

---

### Task 2: adminTheme + AdminThemeToggle + AdminLayout shell

**Files:**

- Create: `fal-pecas/src/lib/adminTheme.ts`
- Create: `fal-pecas/src/components/admin/AdminThemeToggle.tsx`
- Modify: `fal-pecas/src/components/admin/AdminLayout.tsx`
- Modify: `fal-pecas/src/lib/adminNavAccess.ts` (path Busca já coberto se `/admin/busca` existir)
- Test: smoke manual + opcional teste unitário de `adminTheme.ts`

**Interfaces:**

- Produces: `getAdminTheme(): 'dark' | 'light'`, `setAdminTheme(t)`, `subscribeAdminTheme(cb)`
- Consumes: tokens Task 1

- [ ] **Step 1: Criar `adminTheme.ts`**

```ts
const KEY = 'fal-admin-theme'

export type AdminTheme = 'dark' | 'light'

export function getAdminTheme(): AdminTheme {
  try {
    const v = localStorage.getItem(KEY)
    if (v === 'light' || v === 'dark') return v
  } catch { /* ignore */ }
  return 'dark'
}

export function setAdminTheme(theme: AdminTheme): void {
  try {
    localStorage.setItem(KEY, theme)
  } catch { /* ignore */ }
  window.dispatchEvent(new CustomEvent('fal:admin-theme', { detail: theme }))
}

export function applyAdminThemeClass(el: HTMLElement, theme: AdminTheme): void {
  el.classList.toggle('dark', theme === 'dark')
}
```

- [ ] **Step 2: Criar `AdminThemeToggle.tsx`**

Botão ícone sol/lua, `aria-pressed={theme === 'dark'}`, `aria-label` dinâmico, chama `setAdminTheme`.

- [ ] **Step 3: Integrar no `AdminLayout`**

- Estado `theme` inicializado com `getAdminTheme()`
- `useEffect` aplica `applyAdminThemeClass` no root do layout (wrapper `div.dark` envolvendo aside+main, **não** no `document.documentElement` se a loja puder montar no mesmo tree — preferir wrapper admin-only)
- Incluir `<AdminThemeToggle />` no header mobile e no rodapé/topo do aside
- Trocar `linkClass` ativo de `bg-fal-yellow text-fal-navy-dark` para algo como:

```ts
isActive
  ? 'bg-fal-accent text-white'
  : 'text-white/85 hover:bg-white/10'
```

- [ ] **Step 4: Adicionar Busca na sidebar Catálogo**

Em `catalogLinks`:

```ts
{ to: '/admin/busca', label: 'Busca' },
```

(posição: após Home/Promoções ou antes de Montadoras — preferir após Categorias)

Confirmar `PATH_ROLES['/admin/busca']` já existe em `adminNavAccess.ts`.

- [ ] **Step 5: Smoke**

Run: `npm run dev` → `/admin`  
Esperado: abre dark; toggle troca claro/escuro e persiste após F5; item ativo azul; link Busca visível.

---

### Task 3: AdminTabs + migrar HomeSectionTabs

**Files:**

- Create: `fal-pecas/src/components/admin/AdminTabs.tsx`
- Modify: `fal-pecas/src/pages/admin/home/AdminHomeSectionTabs.tsx`

**Interfaces:**

- Produces: `AdminTabs({ items, activeId, onChange? })` com item ativo `bg-fal-accent text-white` (ou surface + border accent no light)

- [ ] **Step 1: Implementar `AdminTabs`**

API mínima:

```tsx
export type AdminTabItem = {
  id: string
  label: string
  to?: string
  onSelect?: () => void
}

export function AdminTabs(props: {
  items: AdminTabItem[]
  activeId: string
  'aria-label': string
}) { /* NavLink ou button; ativo = accent */ }
```

- [ ] **Step 2: Refatorar `AdminHomeSectionTabs` para usar `AdminTabs`** (incluir Promoções como `to`)

- [ ] **Step 3: Smoke em `/admin/home`** — aba ativa azul; CTA da página (se houver Button primary) continua amarelo.

---

### Task 4: Favorito vermelho (loja)

**Files:**

- Modify: `fal-pecas/src/components/product/ProductCard.tsx`
- Modify: `fal-pecas/src/pages/Product/ProductPage.tsx`

- [ ] **Step 1: ProductCard — classes no botão**

```tsx
className={[
  'absolute top-3.5 right-3.5 z-[2] grid h-11 w-11 place-items-center rounded-full border border-fal-line bg-white/95 text-base shadow-sm',
  liked ? 'text-fal-favorite border-fal-favorite/40' : 'text-fal-muted hover:border-fal-navy',
].join(' ')}
```

- [ ] **Step 2: Mesma lógica no `ProductPage` botão favorito**

- [ ] **Step 3: Smoke** — logado, favoritar no card e PDP; coração vermelho; remover volta ao muted.

---

### Task 5: Dashboard Overview (REPAGINE)

**Files:**

- Modify: `fal-pecas/src/pages/admin/AdminDashboardPage.tsx`

**Interfaces:**

- Consumes: dados já carregados (`counts`, `attention`, `totals`, `visibleSections`)

- [ ] **Step 1: Reescrever `Kpi` com hierarquia**

```tsx
function Kpi({
  label,
  value,
  to,
  tone = 'neutral',
}: {
  label: string
  value: string
  to: string
  tone?: 'neutral' | 'warning' | 'danger' | 'success' | 'info'
}) {
  const toneCls = {
    neutral: 'border-fal-line',
    warning: 'border-fal-warning/40 bg-fal-warning/10',
    danger: 'border-fal-danger/40 bg-fal-danger/10',
    success: 'border-fal-success/40 bg-fal-success/10',
    info: 'border-fal-accent/40 bg-fal-accent/10',
  }[tone]
  return (
    <Link to={to} className={`rounded-[12px] border bg-fal-surface px-3 py-3 shadow-sm ${toneCls}`}>
      <div className="text-[11px] font-bold uppercase tracking-wide text-fal-muted">{label}</div>
      <div className="mt-1 text-xl font-extrabold tabular-nums text-fal-fg">{value}</div>
    </Link>
  )
}
```

- [ ] **Step 2: Mapear tons** (ex.: aguardando pagamento = warning; ação equipe = danger; entregues = success; receita = info)

- [ ] **Step 3: Trocar `bg-white` → `bg-fal-surface` na página; texto `text-fal-fg` onde era navy hardcoded em títulos

- [ ] **Step 4: Compactar seção de atalhos**

Opção A (preferida): remover grid Catálogo/Vendas/Operação (já está na sidebar)  
Opção B: manter 1 linha de chips por grupo sem `desc` longa  

Default do plano: **Opção A** + link “Abrir módulos pela barra lateral” se necessário.

- [ ] **Step 5: Ajustar H1/copy**

H1: `Painel` ou `Overview`  
Sub: foco operacional + atalho Central de Pedidos — sem fingir que a página é só pedidos se ainda houver KPIs gerais.

- [ ] **Step 6: Smoke `/admin`** em dark e light — KPIs legíveis; atenção; fluxo; sem sitemap duplicado.

---

### Task 6: Copy + breadcrumbs + hubs (AJUSTE)

**Files:**

- Modify: `fal-pecas/src/lib/adminBreadcrumbs.ts` (add `prazos: 'Prazos de entrega'`, etc.)
- Modify: `fal-pecas/src/pages/admin/logistics/AdminLogisticsHubPage.tsx` (copy cards em linguagem de benefício)
- Modify: `fal-pecas/src/pages/admin/AdminDashboardPage.tsx` se labels restarem
- Modify (loja empties CTA): `CartPage`, `CheckoutPage`, `AccountFavoritesPage` — unificar CTA para **Ver catálogo**

- [ ] **Step 1: Completar `SEGMENT_LABELS`**

```ts
prazos: 'Prazos de entrega',
eta: 'Prazos de entrega', // se slug diferente
```

- [ ] **Step 2: Revisar 3–5 cards do hub Logística** — título curto + 1 linha “para que serve”

- [ ] **Step 3: Unificar CTA empty loja** para `Ver catálogo` / `actionTo="/catalogo"`

- [ ] **Step 4: Smoke** breadcrumbs em `/admin/logistica/prazos`; empties carrinho/favoritos.

---

### Task 7: Migrar mais superfícies admin (hotspots) + Notificações tabs

**Files:**

- Modify: hubs `AdminOrdersHubPage.tsx`, `AdminPaymentsHubPage.tsx`, `AdminLogisticsHubPage.tsx` — `bg-white` → `bg-fal-surface`
- Modify: `AdminNotificationsPage.tsx` — usar `AdminTabs` se houver tablist Button

- [ ] **Step 1: Replace mecânico nos hubs** `bg-white` → `bg-fal-surface` (revisar contraste dark)

- [ ] **Step 2: Notificações** — tab filters via `AdminTabs`

- [ ] **Step 3: Smoke hubs em dark**

---

### Task 8: Verificação final + docs

**Files:**

- Modify: `docs/entrada/IDENTIDADE_VISUAL.md` (se ainda faltar)
- Modify: `docs/planejamento/FAL_AUDITORIA_UI_CORES_IDENTIDADE_2026-11-16.md` — marcar critérios §10

- [ ] **Step 1: Checklist aceite (auditoria §10)**

- [ ] Admin dark default + toggle  
- [ ] Ativo accent; CTA amarelo  
- [ ] Overview sem sitemap  
- [ ] Favorito vermelho  
- [ ] Busca na sidebar  
- [ ] Ainda é FAL?

- [ ] **Step 2: Rodar testes existentes**

Run: `cd fal-pecas && npm test -- --run`  
Esperado: suite verde (ou só falhas pré-existentes documentadas).

- [ ] **Step 3: Atualizar status da auditoria** para “Gate 0 implementado / VAL pendente” se aplicável.

---

## Spec coverage (self-review)

| Requisito spec/auditoria | Task |
|--------------------------|------|
| Tokens + dark | 1 |
| Toggle + ativo accent + Busca | 2 |
| AdminTabs | 3, 7 |
| Favorito vermelho | 4 |
| Dashboard Overview | 5 |
| Copy / breadcrumbs / empties | 6 |
| Hotspots surface hubs | 7 |
| Aceite + identidade doc | 8 |
| Checkout P2 / emoji P2 | Fora (auditoria §9 P2) |

## Placeholder scan

Sem TBD de implementação nas Tasks 1–8; P2 explicitamente fora.

---

## Execution handoff

Plano salvo em `docs/superpowers/plans/2026-11-16-ui-cores-admin-loja.md`.

**Opções de execução:**

1. **Subagent-Driven (recomendado)** — um subagente por task + review entre tasks  
2. **Inline Execution** — executar nesta sessão com checkpoints  

Qual abordagem?
