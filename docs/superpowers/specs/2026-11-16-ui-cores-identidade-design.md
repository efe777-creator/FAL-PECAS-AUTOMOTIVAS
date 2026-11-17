# Design — UI cores, identidade, dark admin, dashboard Overview

**Data:** 2026-11-16  
**Status:** APROVADO PARA MARCHA (plano tático V2)  
**Auditoria:** [`docs/planejamento/FAL_AUDITORIA_UI_CORES_IDENTIDADE_2026-11-16.md`](../../planejamento/FAL_AUDITORIA_UI_CORES_IDENTIDADE_2026-11-16.md)  
**Identidade canônica:** [`docs/entrada/IDENTIDADE_VISUAL.md`](../../entrada/IDENTIDADE_VISUAL.md)  
**Plano tático V2:** Cursor plan `ui_fal_tático_v2` + espelho em [`docs/superpowers/plans/2026-11-16-ui-cores-admin-loja.md`](../plans/2026-11-16-ui-cores-admin-loja.md)

---

## 1. Problema

A marca FAL (navy + amarelo) existe nos tokens e no CTA, mas a UI admin/loja parece chapada: branco/navy demais, amarelo misturado com “estado ativo”, sem dark no admin, Dashboard operacional sem hierarquia visual, e microestados (favorito) sem cor.

## 2. Objetivos

1. Mais cor e destaque **sem excessos**
2. Preservar identidade (navy + amarelo CTA + logo)
3. Dark no admin com toggle liga/desliga (default dark)
4. Dashboard Overview moderno (referência Storexio → tradução FAL)
5. Unificar abas/menus ativos (accent azul)
6. Corrigir copy/hierarquia incoerente nas telas tocadas
7. Favorito ativo vermelho

## 3. Não-objetivos (1ª entrega)

- Dark na loja
- Big bang de todas as páginas
- Primary button azul
- Novas métricas de negócio
- Reorganizar filas de expedição para Logística

## 4. Princípios de cor

| Papel | Token | Uso |
|-------|-------|-----|
| Marca / CTA | `fal-yellow*` | Botões primary, destaques pontuais |
| Navegação ativa | `fal-accent` (azul novo) | Menu sidebar, aba selecionada |
| Estrutura | `fal-navy*` / `fal-fg` | Texto, sidebar base |
| Semântica | `fal-success`, `fal-warning`, `fal-danger` | Status, KPI, alerta |
| Afeto | `fal-favorite` | Coração liked |
| Superfície | `fal-bg`, `fal-surface`, `fal-line`, `fal-muted` | Pares light + dark |

Regra de viewport: no máximo ~3 acentos coloridos competindo (ex.: ativo + CTA + 1 badge).

## 5. Dark admin

- Escopo: shell `/admin` (`AdminLayout`)
- Default: dark
- Persistência: `localStorage` chave `fal-admin-theme` (`dark` | `light`)
- Toggle: botão no header (mobile) e no aside/topo (desktop), `aria-pressed`, labels “Ativar modo claro” / “Ativar modo escuro”
- Implementação Tailwind v4: `@custom-variant dark (&:where(.dark, .dark *));` + overrides CSS variables em `.dark`
- Loja: permanece `:root` claro

## 6. Componentes-alvo

### 6.1 Tokens

Arquivo: `fal-pecas/src/styles/index.css`  
Atualizar espelho em `IDENTIDADE_VISUAL.md` após validação.

### 6.2 ThemeToggle

Novo: `fal-pecas/src/components/admin/AdminThemeToggle.tsx`  
Usado em `AdminLayout.tsx`.

### 6.3 AdminTabs

Novo: `fal-pecas/src/components/admin/AdminTabs.tsx`  
API: lista `{ id, label, to? | onSelect }`, `activeId`, variante surface.  
Migrar: HomeSectionTabs, Notificações filters, OwnDelivery tabs, PriceList pills (fase P0/P1).

### 6.4 Dashboard Overview

`AdminDashboardPage.tsx`:

1. Header + período/contexto (se houver dado; senão omitir)
2. Faixa KPIs (cor semântica + ícone simples; sem inventar %)
3. Atenção (tabela/lista com badges)
4. Fluxo operacional (grupos)
5. Atalhos: compactos ou link “Ver módulos” — não grid longo igual sidebar

### 6.5 Favorito

`ProductCard.tsx` + `ProductPage.tsx`: liked → `text-fal-favorite` (vermelho).

## 7. Hierarquia IA (ajuste fino)

- Incluir **Busca** em Catálogo na sidebar
- Alinhar cards do Dashboard aos itens da nav (mesmos nomes)
- Glossário: ver auditoria §7.2
- Breadcrumbs: completar labels (`prazos`, etc.)

## 8. Contrato visual travado (Gate 1)

### 8.1 Hex aprovados

| Token | Light | Dark (só superfícies/texto tema) |
|-------|-------|----------------------------------|
| `fal-navy` | `#303846` | **não inverte** (marca/sidebar) |
| `fal-navy-dark` | `#252c36` | **não inverte** |
| `fal-navy-2` | `#46515e` | **não inverte** |
| `fal-yellow` | `#f2c84b` | `#f2c84b` (CTA) |
| `fal-accent` | `#3b82f6` | `#60a5fa` (ativo legível em dark content) |
| `fal-accent-hover` | `#2563eb` | `#3b82f6` |
| `fal-warning` | `#d97706` | `#fbbf24` |
| `fal-favorite` | `#e11d48` | `#fb7185` |
| `fal-fg` | `#252c36` | `#e8ecf0` |
| `fal-ink` | alias → `fal-fg` | alias → `fal-fg` |
| `fal-bg` | `#f4f6f7` | `#1a1f26` |
| `fal-surface` | `#ffffff` | `#242b33` |
| `fal-surface-2` | `#f8f9fa` | `#2c343e` |
| `fal-line` | `#dfe4e8` | `#3a4450` |
| `fal-muted` | `#5a6570` | `#9aa3ad` |
| `fal-success` | `#168a55` | `#34d399` |
| `fal-danger` | `#c0392b` | `#f87171` |

### 8.2 Regras de UI

- Ativo menu/aba = `fal-accent` + peso tipográfico (não só cor)
- CTA = `fal-yellow` + `text-fal-navy-dark` (nunca accent)
- Favorito liked = `fal-favorite`
- Máx. 3 acentos por viewport
- Dark só no wrapper `AdminLayout`
- H1 Dashboard = **Painel**
- Busca na sidebar após Categorias

### 8.3 Figma

Arquivo: https://www.figma.com/design/ZrVkWnp1krjj6c8uboRlYT — frames Tokens Light, Tokens Dark surfaces, Estados UI.

## 9. Critérios de aceite

Ver auditoria §10 + plano tático V2 (critérios mensuráveis).

## 10. Riscos

| Risco | Mitigação |
|-------|-----------|
| Dark quebra `bg-white` residual | Migrar hotspots primeiro; resto herda depois |
| Accent azul “SaaSifica” | Amarelo CTA forte; teste de marca |
| Escopo explode | Matriz OK/AJUSTE/REPAGINE; P2 explícito |
