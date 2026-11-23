# FAL Padrão — Telas · Layout · Design

**Versão do padrão:** `FAL-UI-LAYOUT **v1.6.3**`  
**Data:** 2026-11-23 · Branch âncora: **`dev`**  
**Status:** normativo — toda evolução admin (e loja quando aplicável) deve **registrar versão** e **passar antiregressão**

Este documento é a **fonte de verdade de excelência visual/operacional** da FAL.  
Não substitui domínio (preço, BOM, place_order); define **como a tela se comporta e se apresenta**.

---

## 0. Como evoluir (obrigatório)

```mermaid
flowchart LR
  Proposta --> Changelog
  Changelog --> Antiregress
  Antiregress --> VAL
  VAL --> Dev
  Dev --> Main
```

| Passo | Obrigação |
|-------|-----------|
| 1. Proposta | Descrever o que muda no layout/UX (não só “melhorar”) |
| 2. Changelog | Entrada em [§9 Changelog](#9-changelog-do-padrão) com bump de versão |
| 3. Antiregress | Atualizar ou acrescentar locks em `falUiLayoutAntiregress.test.ts` |
| 4. VAL / uso real | Smoke + checklist §8; doc VAL se marcha |
| 5. `dev` | Só então merge/push `dev` |
| 6. `main` | Só com autorização expressa eFe |

### Semântica de versão do padrão

| Bump | Quando |
|------|--------|
| **PATCH** `v1.0 → v1.0.1` | Copy, densidade, polish sem mudar contratos (ex.: hint Enter no compact) |
| **MINOR** `v1.0 → v1.1` | Novo módulo Adaptive, novo WorkSurface, novo invariante FL* |
| **MAJOR** `v1.x → v2.0` | Quebra shell (ex.: trocar Adaptive, prefs key, vocabulário Abrir guia) — exige gate eFe + migração |

**Regra:** código sem bump + antiregress atualizado = **não é evolução FAL**; é drift.

---

## 1. Pilares (não negociáveis)

1. **Um shell de trabalho admin:** `AdaptiveWorkspace` + `PanelChrome` — não inventar segundo split.  
2. **Tokens FAL:** `--fal-*` / `bg-fal-*` / `text-fal-*` / `border-fal-*` — sem paleta paralela (evitar purple-on-white, cream genérico, etc.).  
3. **Vocabulário operacional único** (Central → Catálogo → futuros hubs).  
4. **Primary compacto clicável** com guia aberta (lição VAL OrderOps 19/11 + uso real Kits 21/11).  
5. **Container ≠ viewport** para grids densos no primary estreito (`@container`, lição Painel KPI 21/11).  
6. **Prefs ortogonais:** workspace `fal-admin-workspace-v1` ≠ RGL `fal-admin-dashboard-layout-*`.  
7. **Domínio intocado** por mudança de layout: RPCs, resolve_price, place_order, H2/H5/H6.

Âncora Adaptive já documentada: [FAL_PADRAO_ADAPTIVE_CENTRAL_PAINEL_CATALOGO_2026-11-21.md](./FAL_PADRAO_ADAPTIVE_CENTRAL_PAINEL_CATALOGO_2026-11-21.md)  

**Veículos:** CRUD em Adaptive (`moduleKey="vehicles"`, lista + guia) desde **v1.6.0**. Hub **Integrações** permanece chips/cards (família Pagamentos) e abre a guia via ponte.

---

## 2. Anatomia de tela admin (padrão zin)

### 2.1 Hub Adaptive (lista + guia)

```
┌─────────────────────────────────────────────────────────────┐
│ Admin shell (nav + sticky header)                           │
├──────────────────────────┬──────────────────────────────────┤
│ PRIMARY                  │ CONTEXTUAL docked (PanelChrome)  │
│ data-workspace-primary=  │ Arraste borda · Fechar (×)       │
│   compact | full         │ WorkSurface · guias empilhadas   │
│ Lista / filtros / KPIs   │ right/bottom 0 · radius só left  │
│ SEMPRE clicável          │                                  │
└──────────────────────────┴──────────────────────────────────┘
```

| Peça | Contrato |
|------|----------|
| `moduleKey` | `orders` \| `dashboard` \| `products` \| `kits` \| `prices` \| `applications` \| `vehicles` (+ futuras só por MINOR) |
| Modos | `split` \| `expanded` \| `fullscreen` \| `collapsed` |
| Desktop | ≥ `lg` (1024) split; &lt; lg contextual fullscreen |
| Guia docked | **In-flow** (`data-workspace-panel="docked"`): flex lista\|guia; `sticky`; **sem** `fixed`+spacer (evita buraco); bleed `-mr` cancela padding do `main`; arraste na borda |
| Multi-guia | `OrderSplitTabPanels` / `useIdSplitTabs` — empilhar IDs, não minimizar |
| Full page | Rota dedicada para formulário “comfortable” (abas) |

### 2.2 Ficha full (produto / kit / lista F8)

| Contrato | Detalhe |
|----------|---------|
| Abas | `AdminTabs` — uma responsabilidade por aba |
| Produto | Geral \| Precificação \| Mídia \| Aplicações \| Logística \| Relações |
| Kit | Geral \| Precificação \| Composição \| Mídia \| Aplicações \| Logística |
| Lista F8 | Produtos \| Formação \| Importações \| Configuração |
| Persistência de aba | query `?tab=` quando já existir no domínio (F8); não inventar storage paralelo |

### 2.3 Painel (RGL)

- Widgets em `react-grid-layout`; **ortogonal** ao Adaptive.  
- Grids internos de KPI: **`@container`**, nunca só `sm:`/`xl:` de viewport.  
- `rowHeight` + `minSize` devem caber o conteúdo real (evitar smash).

---

## 3. Design tokens e superfície

| Token / classe | Uso |
|----------------|-----|
| `--fal-navy` / yellow | Marca, CTAs fortes |
| `--fal-accent` | Foco, tabs ativas, links de ação |
| `--fal-surface` + `border-fal-line` | Cards/painéis admin |
| `rounded-[14px]` / `--fal-radius` | Cantos padrão hub |
| `rounded-[12px]` / `[10px]` | Nested / densos |
| `fal-admin-scroll` | Scroll interno de listas |
| `.dark` | Espelhar tokens em `index.css` — não hardcode cinza solto |

**Anti-padrões (proibidos em novas telas):**
- Segundo design system (Inter/purple gradient/cream terracotta genérico AI)
- Cards decorativos no hero da loja (regra produto); no admin, card só se for unidade de interação
- Glow / multi-shadow / pill clusters sem função
- Overlay de painel que **bloqueia** cliques do primary (regressão compact)

Fonte CSS: `fal-pecas/src/styles/index.css`

---

## 4. Vocabulário (UI copy — travado)

| Termo | Significado |
|-------|-------------|
| Abrir guia | Abre contextual Adaptive (1ª guia) |
| Na guia | Já está no stack |
| + Guia | Empilha outro registro (já há guia aberta) |
| Arrastar borda da guia | Largura `splitWidthPx` (sem botões Estreita/Larga) |
| Expandir / Tela cheia | Só via `modeApiRef` (Pedidos/Painel) — sem botões no chrome |
| Mais filtros / Recolher filtros | Bloco de filtros do hub Produtos |
| Expandir / Recolher | Seções dentro da guia Produto |
| Abrir cadastro | Full `/admin/produtos/:id` ou `/admin/kits/:id` |
| Abrir lista completa | Full `/admin/precos/:id?tab=produtos` |
| Fechar guia | Collapse contextual |
| Central de pedidos | Label nav (não “Pedidos” solto) |
| Listas de preço | Label nav (nunca “Listas de preços” no label) |

---

## 5. Mapa de módulos (v1.6.0)

| Módulo | `moduleKey` | Primary | Contextual | Full |
|--------|-------------|---------|------------|------|
| Central | `orders` | Hub pedidos | `OrderOpsSurface` | `/admin/pedidos/:id` |
| Painel | `dashboard` | RGL widgets | Pedido / attention | — |
| Produtos | `products` | Lista + filtros compactos | `ProductWorkSurface` (foto + seções + mutações leves) | ficha abas |
| Kits | `kits` | Lista kits | `KitWorkSurface` (BOM + Novo na guia) | ficha abas + PVC |
| Preços | `prices` | Overview listas | `PriceListWorkSurface` (QuickAdjust embutido) | F8 |
| Aplicações | `applications` | Lista + filtros compactos | `ApplicationWorkSurface` (criar / período / veículo / bulk) | import planilha |
| Classificação | `categories` | Árvore/lista + integridade + arquivados | `CategoryWorkSurface` (criar/editar) | — |
| Promoções | `promotions` | Abas + lista + filtros | `PromotionWorkSurface` (incluir/ativar) | — |
| Estoque | `inventory` | Modo + lista compacta | `InventoryWorkSurface` (ajuste + movimentos) | — |
| Clientes | `customers` | Busca + lista compacta | `CustomerWorkSurface` (B2B + pedidos) | pedido full |
| Veículos | `vehicles` | Lista + filtros + scroll | `AdminVehicleGuidePanel` (modelo + VV) | Integrações chips |

Dinâmica catálogo (v1.0.4): [FAL_MARCHA_UI_LAYOUT_v104_VAL_2026-11-21.md](./FAL_MARCHA_UI_LAYOUT_v104_VAL_2026-11-21.md)  
Marcha Aplicações: [FAL_MARCHA_UI_LAYOUT_v110_APLICACOES_VAL_2026-11-21.md](./FAL_MARCHA_UI_LAYOUT_v110_APLICACOES_VAL_2026-11-21.md) · estudo [FAL_ESTUDO_APLICACOES_WORKSPACE_TOBE_2026-11-21.md](./FAL_ESTUDO_APLICACOES_WORKSPACE_TOBE_2026-11-21.md)  
Marcha Classificação: [FAL_MARCHA_UI_LAYOUT_v120_CATEGORIAS_VAL_2026-11-21.md](./FAL_MARCHA_UI_LAYOUT_v120_CATEGORIAS_VAL_2026-11-21.md)  
Estudo UX: [FAL_ESTUDO_UX_ADAPTIVE_ORGANIZADO_2026-11-21.md](./FAL_ESTUDO_UX_ADAPTIVE_ORGANIZADO_2026-11-21.md)  
Marcha Promoções: [FAL_MARCHA_UI_LAYOUT_v130_PROMOCOES_VAL_2026-11-21.md](./FAL_MARCHA_UI_LAYOUT_v130_PROMOCOES_VAL_2026-11-21.md)  
Marcha Estoque: [FAL_MARCHA_UI_LAYOUT_v140_ESTOQUE_VAL_2026-11-21.md](./FAL_MARCHA_UI_LAYOUT_v140_ESTOQUE_VAL_2026-11-21.md)  
Marcha Clientes: [FAL_MARCHA_UI_LAYOUT_v150_CLIENTES_VAL_2026-11-21.md](./FAL_MARCHA_UI_LAYOUT_v150_CLIENTES_VAL_2026-11-21.md)

**Não é padrão zin (ainda):** Home multi-aba, Avisos — backlog seletivo. Hub Integrações veículos = chips (não Adaptive).

---

## 6. Invariantes antiregressão (locks FL*)

Código: `fal-pecas/src/lib/falUiLayoutAntiregress.test.ts`  
Script: `pnpm test:ui-layout-antiregress`

| ID | Invariante | Tipo |
|----|------------|------|
| **FL1** | `AdaptiveWorkspace` + hubs orders/dashboard/products/kits/prices/applications/categories/promotions/inventory/customers/**vehicles** usam `moduleKey` | fonte |
| **FL2** | Prefs `fal-admin-workspace-v1` + keys incl. inventory/customers; sem gravar selectedId | fonte + unit prefs |
| **FL3** | `data-workspace-primary` compact\|full no shell | fonte |
| **FL4** | CSS compact primary (orders) + regra `@container` no exec-summary | fonte |
| **FL5** | Vocabulário Abrir guia / Fechar guia / **Listas de preço** (nav + hubs + Home/fornecedor; sem “preços” plural no label) | fonte |
| **FL6** | WorkSurfaces: Product / Kit / PriceList / Application / Category / Promotion / Inventory / Customer exportados | fonte |
| **FL7** | Tokens `--fal-fg/bg/surface/accent` + `.dark` | fonte |
| **FL8** | PZ: RGL key distinta de workspace (comentário/ortogonalidade em prefs) | fonte |
| **FL9** | AdminTabs nas fichas produto e kit | fonte |
| **FL10** | kits-manual fora da guia preços; **1 CTA** `Preços dos kits` → `/admin/kits/precos` | fonte |
| **FL11** | Hubs Adaptive + WorkSurfaces **sem** `<Link><Button>`; Links de ação com `buttonClassName` | fonte |
| **FL12** | QuickAdjust `embedded`: sem Abrir lista / Importar duplicados; kit form `showPricesLink` só em Precificação | fonte |
| **FL13** | Kits: **Novo na guia** vs **Cadastro completo**; rotas `/admin/kits/novo` · `/kits/precos` · importar-kits | fonte |
| **FL14** | Produtos: filtros **compactos/expansíveis** (`admin-products-filters` + chips ativos) | fonte |
| **FL15** | Guia Produto: foto + seções expansíveis (identidade/preço/categoria/apps/kits/relacionados); **+ Guia**; ponte `fal.kits.openGuideId` | fonte |
| **FL16** | Hub Aplicações: `AdaptiveWorkspace` `moduleKey="applications"`; lista compact; filtros expansíveis; **+ Guia** | fonte |
| **FL17** | `ApplicationWorkSurface` (criar/editar/swap/bulk na guia); sem form criar permanente no primary; atalho guia Produto → hub `?q=`; chip `productId` | fonte |
| **FL18** | Pontes guia↔guia: `adminGuideBridges` (`products` / `applications` / `kits`); CTAs Abrir guia + Cadastro completo | fonte |
| **FL19** | Cascata PVC compartilhada: `pvcVehicleCascade` (hub + ficha); hint coringa único; ficha → Hub Aplicações | fonte |
| **FL20** | OrderOps tabs `min-h-11` + tablist `rounded-fal`; PanelChrome ≥44px; Home Trust/Vehicles `rounded-fal`; carrossel; promoções `fal-warning`; **Logística:** QuickActions antes de Ida×devolução; painel contexto sem H2/jargão; CTA primary | fonte |
| **FL20** | Hub Classificação Adaptive: `moduleKey="categories"` + `CategoryWorkSurface`; sem form mid-page; lista compact mobile; dirty ao trocar; max-h browse | fonte |
| **FL21** | Polish P0: lote Produtos só via barra; chips Editar Apps; CTA guia amarelo unificado | fonte |
| **FL22** | Hub Promoções Adaptive: `moduleKey="promotions"` + `PromotionWorkSurface`; sem form mid-page; filtros expansíveis | fonte |
| **FL23** | Hub Estoque Adaptive: `moduleKey="inventory"` + `InventoryWorkSurface`; sem painel mid-page 2 colunas | fonte |
| **FL24** | Hub Clientes Adaptive: `moduleKey="customers"` + `CustomerWorkSurface`; sem painel mid-page 2 colunas | fonte |
| **FL25** | Revisão no Hub Adaptive (fila canônica + lista + CTAs) | fonte |
| **FL26** | Guia Preços: colunas Custo\|Margem\|Preço; edição híbrida (dblclick/Enter/F2→modal; inline preço; botão Editar); paridade lista completa | fonte |
| **FL27** | Adaptive: resize por arraste (`role=separator` na borda da guia); chrome só Fechar; prefs `guideDensity` + presets no prefs (sem botões); `modeApiRef` programático; Garagem nav in-place | fonte |
| **FL28** | Guia desktop **in-flow sticky**: `data-workspace-panel=docked`; sem spacer/fixed docked; bleed `-mr-3…md:-mr-6`; grip separator; overlay só mobile/fullscreen | fonte |

Herdados Adaptive (PZ1–PZ6): ver doc padrão zin — **não regredir Central/Painel**.

---

## 7. Densidade e responsivo

| Contexto | Densidade |
|----------|-----------|
| Lista hub | Linhas compactas; badges status/INCOMPLETO; hint “Na guia” |
| Guia | Chrome fino; ações no topo; scroll interno; BOM/QuickAdjust em 1º plano |
| Full | Abas; formulários longos; mídia/apps |
| Primary &lt; ~520px | Cards ou 2 col via `@container`; nunca 4 KPI empilhados smash |

**Checklist compact (obrigatório em VAL de hub Adaptive):**
- [ ] Com guia aberta, dá para Abrir guia / filtrar / selecionar na lista  
- [ ] Nenhum `select`/form da guia cobre a coluna primary  
- [ ] Fechar guia → `data-workspace-primary=full`

---

## 8. Checklist de excelência (cada marcha UI)

1. Spec / changelog bump  
2. `tsc` + `pnpm test:ui-layout-antiregress`  
3. Smoke hub: Abrir guia → ação → Fechar → full  
4. Regressão: Central + Painel KPI + (se catálogo) Promo itens/kits  
5. Atualizar VAL ou doc uso real  
6. Sem commit em `main` sem gate eFe  

---

## 9. Changelog do padrão

### v1.6.3 — 2026-11-23 (PATCH)

**Guia Adaptive in-flow (fecha o buraco):**
- Desktop: flex lista\|guia sticky — **não** `fixed` + spacer (causava vão escuro)
- Bleed `-mr/-mb` cancela padding do AdminLayout
- Lock **FL28** atualizado

### v1.6.2 — 2026-11-23 (PATCH)

**Guia Adaptive docked (iteração):** tentativa right/bottom 0 + spacer — supersedida por v1.6.3 in-flow.

### v1.6.1 — 2026-11-23 (PATCH)

**Adaptive resize por arraste:**
- Grip na borda esquerda do painel (`cursor-col-resize`); remove Estreita/Larga/−/+ / Compacta / Expandir / Tela cheia do chrome
- PanelChrome: título + badge + extraActions + Fechar (×)
- `modeApiRef` permanece para Pedidos/Painel pedirem expanded/fullscreen
- Lock **FL27** atualizado · **FL1** chrome sem `onSplitWidthStep`

### v1.6.0 — 2026-11-23 (MINOR)

**Veículos Adaptive (lista + guia):**
- `moduleKey="vehicles"` + `AdminVehicleGuidePanel` (modelo + configs VV)
- Primary: busca termo livre, filtros, `fal-admin-scroll`, duplo clique → Abrir guia
- Hub Integrações: chips/cards; ponte `VEHICLES_OPEN_GUIDE_KEY`; aprovação sem `window.prompt`
- Manual create permanece verified; import/sync continua review
- Lock **FL1** estendido (vehicles)

### v1.5.3 — 2026-11-22 (MINOR)

**Guias · dimensões · edição (estudo + marchas 1→3→2):**
- Preços: grade Custo\|Margem %\|Preço; híbrido dblclick/Enter/F2 + inline preço + Editar
- Adaptive: `guideDensity` em prefs; presets Estreita/Larga; `data-guide-density`
- Garagem: sidebar “Garagem” = Resumo in-place; chips só mobile; Visual só em Mais
- Estudo: `FAL_ESTUDO_GUIAS_DIMENSOES_EDICAO_2026-11-22.md`
- Locks **FL26** · **FL27**

### v1.5.2 — 2026-11-22 (PATCH)

**Hierarquia guia Logística (pós-venda):**
- Ordem: **Caso + mensagem + CTAs** → Ida × devolução (contexto) → Frete → Expedição
- Painel Ida×devolução: micro-label (sem H2/accent); sem `cart_item_id`/`live-ready` na UI
- QuickActions: CTA principal `primary` por estágio
- Lock **FL20** estendido

### v1.5.1 — 2026-11-22 (PATCH)

**Widgets/guias — alinhamento touch + radius (auditoria layout):**
- OrderOps: tablist `rounded-fal`; tabs `min-h-11` (antes `min-h-8`); painéis de seção → `rounded-fal`
- PanelChrome: controles `min-h-11` / `rounded-[10px]`
- Home: Trust + Vehicles empty `rounded-fal`; ProductCarousel setas `min-h-11 min-w-11`
- Promoções admin: alerta com tokens `fal-warning` (sem amber Tailwind)
- Lock **FL20**

### v1.5.0 — 2026-11-21 (MINOR)

**Hub Clientes Adaptive:**
- `moduleKey="customers"` + `CustomerWorkSurface` (detalhe, lista B2B assigned, pedidos recentes)
- Primary: busca + lista compacta (Abrir guia); sem grid 2 colunas mid-page
- Lock **FL24**
- VAL: [FAL_MARCHA_UI_LAYOUT_v150_CLIENTES_VAL_2026-11-21.md](./FAL_MARCHA_UI_LAYOUT_v150_CLIENTES_VAL_2026-11-21.md)

### v1.4.0 — 2026-11-21 (MINOR)

**Hub Estoque Adaptive:**
- `moduleKey="inventory"` + `InventoryWorkSurface` (ajuste ± + movimentos na guia)
- Primary: modo loja + busca + lista compacta (Abrir guia / Na guia); sem grid 2 colunas mid-page
- Lock **FL23**
- VAL: [FAL_MARCHA_UI_LAYOUT_v140_ESTOQUE_VAL_2026-11-21.md](./FAL_MARCHA_UI_LAYOUT_v140_ESTOQUE_VAL_2026-11-21.md)
- Domínio `adjustInventory` / modo loja intocado

### v1.3.0 — 2026-11-21 (MINOR)

**Promoções Adaptive + polish P0 (estudo UX organizado/fluido/intuitivo/fácil):**
- Estudo: [FAL_ESTUDO_UX_ADAPTIVE_ORGANIZADO_2026-11-21.md](./FAL_ESTUDO_UX_ADAPTIVE_ORGANIZADO_2026-11-21.md)
- P0: Produtos — barra “Alterações em lote na guia” (sem auto-open); CTAs guia amarelos; Apps chip Editar + Abrir cadastro desktop; Classificação max-h + dirty ao trocar + CTA amarelo
- `moduleKey="promotions"` + `PromotionWorkSurface` (incluir/reativar na guia)
- Primary Promoções: abas + banner + filtros expansíveis + lista; Desativar one-click; Abrir guia / Ativar rápido
- Locks **FL21** · **FL22** (FL1/FL2/FL6/FL20 estendidos)
- VAL: [FAL_MARCHA_UI_LAYOUT_v130_PROMOCOES_VAL_2026-11-21.md](./FAL_MARCHA_UI_LAYOUT_v130_PROMOCOES_VAL_2026-11-21.md)
- Backlog: Estoque Adaptive

### v1.2.0 — 2026-11-21 (MINOR)

**Hub Classificação Adaptive:**
- `moduleKey="categories"` + `CategoryWorkSurface` (criar/editar na guia)
- Primary: resumo + integridade + arquivados + browse (lista/árvore); CTAs + Categoria/Grupo/Subgrupo abrem guia
- Lista compact: `admin-categories-list-mobile/desktop` + CSS primary compact
- Deep link `#medidas-padrao` abre guia e rola para medidas
- Lock **FL20** (FL1/FL2/FL6 atualizados)
- VAL: [FAL_MARCHA_UI_LAYOUT_v120_CATEGORIAS_VAL_2026-11-21.md](./FAL_MARCHA_UI_LAYOUT_v120_CATEGORIAS_VAL_2026-11-21.md)

### v1.1.2 — 2026-11-21 (PATCH)

**Cascata PVC unificada (estudo Fase 3):**
- Lib `pvcVehicleCascade` — opções motor/versão + matching + `PVC_CASCADE_HINT`
- Consumidores: `ApplicationWorkSurface`, filtros hub Aplicações, `AdminProductApplicationsSection`
- Ficha: CTA **Hub Aplicações** (mesmo vocabulário da guia)
- Lock **FL19** + unit `pvcVehicleCascade.test.ts`

### v1.1.1 — 2026-11-21 (PATCH)

**Pontes guia↔guia + higiene Aplicações:**
- `adminGuideBridges`: `fal.products|applications|kits.openGuideId` (one-shot)
- Guia Aplicação → **Abrir guia** (itens) + **Cadastro completo** (ficha)
- Guia Produto → por app **Abrir guia** (hub Aplicações) + Hub filtrado `?q=`
- Chip/Limpar para `?productId=` (ficha); fecha guia órfã se linha sumir do filtro
- Lock **FL18**

### v1.1.0 — 2026-11-21 (MINOR)

**Hub Aplicações Adaptive:**
- `moduleKey="applications"` + `ApplicationWorkSurface` (criar / período / veículo / bulk na guia)
- Primary: lista compact + filtros expansíveis (`fal.applications.filtersExpanded`) + Abrir guia / + Guia / Na guia
- Import planilha permanece CTA fora do split; domínio PVC/import/Liberar intocado
- Atalho guia Produto → `/admin/aplicacoes?q={sku}`
- Locks **FL16** · **FL17** (FL6 inclui ApplicationWorkSurface)
- VAL: [FAL_MARCHA_UI_LAYOUT_v110_APLICACOES_VAL_2026-11-21.md](./FAL_MARCHA_UI_LAYOUT_v110_APLICACOES_VAL_2026-11-21.md)

**Ortogonalidade de versões (não confundir):**
- **FAL-UI-LAYOUT** `v1.1.0` = padrão telas/layout (este doc)
- **`WORKSPACE_VERSION = 1`** / key `fal-admin-workspace-v1` = schema de prefs do shell (só bumpa se mudar formato do JSON)
- **`package.json` `0.0.0`** = versão npm do app — **não** espelha FAL-UI-LAYOUT

### v1.0.4 — 2026-11-21 (PATCH)

**Guia Produto operacional (híbrido SPEC + pedido eFe):**
- Foto + resumo; seções Expandir/Recolher (identidade, preço Base, categoria, aplicações RO, kits com Abrir guia Kits, relacionados + Guia)
- Vocabulário **+ Guia** na lista Produtos/Kits/Preços ao empilhar
- Ponte sessão `fal.kits.openGuideId` → hub Kits abre a guia do kit
- Marcha detalhada (versão + dinâmica + análise): [FAL_MARCHA_UI_LAYOUT_v104_VAL_2026-11-21.md](./FAL_MARCHA_UI_LAYOUT_v104_VAL_2026-11-21.md)
- Correção: salvar na guia **não** dispara `reload()` (preserva seleção)
- Lock **FL15**

### v1.0.3 — 2026-11-21 (PATCH)

**Densidade lista Produtos:**
- Filtros compactos por padrão (Buscar + ações); **Mais filtros** / **Recolher filtros**
- Chips dos filtros ativos quando recolhido; preferência em `sessionStorage`
- Lock **FL14**

### v1.0.2 — 2026-11-21 (PATCH)

**Antiregress + dedupe caminhos/CTAs:**
- Locks **FL11–FL13** (sem Link>Button nos hubs Adaptive; guia preços sem CTA duplicado; Kits Novo na guia / Cadastro completo)
- FL5/FL10 reforçados (vocabulário singular; kits-manual 1 destino)
- Copy alinhada: Home pagamento + import custos → Listas de preço
- Título contextual Kits: Novo na guia

### v1.0.1 — 2026-11-21 (PATCH)

**Ajustes pós uso real:**
- Compact catálogo: cards no primary (`admin-products/kits-list-mobile`) — Abrir guia fora do aside
- BOM: estado `loadingBom` (“Carregando composição…”) — sem flash empty
- Hint compact BOM: “Enter no destaque · multi-seleção · qty na linha”
- Title hub Preços → `Listas de preço | Admin FAL`
- Removido `data-workspace-primary` hardcoded no hub Produtos (só o shell define)
- Locks FL4 estendido + FL4b

### v1.0 — 2026-11-21

**Baseline consolidado:**
- Shell Adaptive (Central, Painel, Produtos, Kits, Preços)
- Tokens fal-* + dark
- Vocabulário operacional
- Lições: compact clicável; `@container` KPI Painel
- Locks FL1–FL10 + script antiregress
- Relatório uso real catálogo (gaps P1 documentados, não bloqueiam v1.0)

**Referências de nascimento:**
- [FAL_PADRAO_ADAPTIVE_CENTRAL_PAINEL_CATALOGO_2026-11-21.md](./FAL_PADRAO_ADAPTIVE_CENTRAL_PAINEL_CATALOGO_2026-11-21.md)
- [FAL_SPEC_CATALOGO_PRECOS_WORKSPACE_2026-11-21.md](./FAL_SPEC_CATALOGO_PRECOS_WORKSPACE_2026-11-21.md)
- [FAL_MARCHA_CATALOGO_ADAPTIVE_USO_REAL_2026-11-21.md](./FAL_MARCHA_CATALOGO_ADAPTIVE_USO_REAL_2026-11-21.md)
- [FAL_MARCHA_ORDER_OPS_SURFACE_VAL_2026-11-19.md](./FAL_MARCHA_ORDER_OPS_SURFACE_VAL_2026-11-19.md)

### Próximos candidatos (não bumpam até implementados)

| Alvo | Bump sugerido |
|------|----------------|
| Novo produto guia curta | MINOR |
| Adaptive Home / Veículos / Avisos (seletivo) | MINOR |
| Smoke multi-guia 2 SKUs + save 1 preço Base | VAL fino |

---

## 10. Referências de código

| Peça | Path |
|------|------|
| Shell | `fal-pecas/src/components/admin/workspace/AdaptiveWorkspace.tsx` |
| Chrome | `fal-pecas/src/components/admin/workspace/PanelChrome.tsx` |
| Prefs | `fal-pecas/src/lib/adminWorkspacePrefs.ts` |
| Tabs | `fal-pecas/src/components/admin/AdminTabs.tsx` |
| Tokens | `fal-pecas/src/styles/index.css` |
| Antiregress | `fal-pecas/src/lib/falUiLayoutAntiregress.test.ts` |
| Regra Cursor | `fal-pecas/.cursor/rules/fal-ui-layout-v1.mdc` |

---

**Assinatura:** FAL-UI-LAYOUT v1.6.3 · excelência registrada · 2026-11-23 · eFe / Cursor
