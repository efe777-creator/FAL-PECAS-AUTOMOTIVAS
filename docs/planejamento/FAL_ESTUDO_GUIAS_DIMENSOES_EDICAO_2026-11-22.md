# FAL — Estudo: guias, dimensões e edição (2026-11-22)

**Branch:** `dev` · **Status:** decisões fechadas para marchas 1→3→2  
**Norma:** [FAL_PADRAO_TELAS_LAYOUT_DESIGN_v1](./FAL_PADRAO_TELAS_LAYOUT_DESIGN_v1_2026-11-21.md)

## Objetivo

Alinhar Adaptive (split/densidade), edição em grade de Preços e nav da Minha Garagem a padrões externos (master-detail, WAI-ARIA grid, M3/Carbon density, stay-on-page) **sem** copiar DS alheio — mapear para tokens FAL.

## Referências externas (síntese)

| Tema | Fontes | Achado útil |
|------|--------|-------------|
| Split / list-detail | R-That split-pane; TessinaUI List→detail; SaaS List-Detail 2026; Android canonical list-detail; M3 panes | Lista ~26–35%; detalhe ganha espaço; persistir ratio; stacked só em compact |
| Densidade | Material 3 Density; Carbon Data table (xs…xl) | Density **opt-in**; md≈40px default; compact≈sm; não densificar CTAs/alertas |
| Edição grade | WAI-ARIA Grid APG; Accessible Data Interfaces (Enter/F2/Esc) | dblclick = acelerador; Enter/F2 abre; Esc cancela; botão Editar obrigatório |
| Nav in-place | Ant Design Navigation / Drawer; progressive disclosure | Minimizar page transitions; subtarefa no contexto |

## Estado FAL (baseline)

| Peça | Hoje |
|------|------|
| Adaptive | `WORKSPACE_SPLIT_DEFAULT=420`, MIN=360, MAX=920, STEP=40; prefs `fal-admin-workspace-v1` |
| Guia Preços | Custo (md+) + Preço + Origem; **sem Margem %**; só botão Editar → modal |
| Lista completa | Já tem Markup + Margem |
| Garagem | Dual route home↔`:id`; módulos in-place só no detalhe via `?modulo=` |

## Decisões fechadas

### Onda 1 — Preços (híbrido)
1. Colunas guia: **Custo | Margem % | Preço** (Origem secundária / “Mais” em compact).
2. Triggers modal: **dblclick** + **Enter/F2** + botão **Editar**.
3. Inline **só Preço** (Enter/blur → manual); Esc cancela; margem ao vivo na linha.
4. Paridade lista completa (mesmos triggers).
5. Lock antiregress: **FL26** (plano Onda1; FL21/22 já ocupados por outros hubs).

### Onda 3 — Poderes da guia
1. Prefs opcional `guideDensity: 'compact' | 'comfortable'` (default comfortable).
2. Presets PanelChrome: **Estreita (420)** / **Larga (720)**; clamp 360–920.
3. CSS `[data-guide-density=compact]` — colunas secundárias off; CTAs ≥44px.
4. Lock: **FL27**.

### Onda 2 — Garagem
1. Shell único: módulos via state/`?modulo=` sem remount home↔detail desnecessário.
2. Um eixo de nav (sidebar desktop / chips mobile).
3. Route change só: trocar `:id`, sair, deep-link.

## Fora de escopo
MAIN/prod · Ads #15 · Button radius global · helpdesk · CNPJ
