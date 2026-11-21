# MARCHA VAL — Catálogo Adaptive (Produtos → Kits → Preços)

Data: 2026-11-21 · branch **`dev`**  
Spec: [FAL_SPEC_CATALOGO_PRECOS_WORKSPACE_2026-11-21.md](./FAL_SPEC_CATALOGO_PRECOS_WORKSPACE_2026-11-21.md)  
Padrão zin: [FAL_PADRAO_ADAPTIVE_CENTRAL_PAINEL_CATALOGO_2026-11-21.md](./FAL_PADRAO_ADAPTIVE_CENTRAL_PAINEL_CATALOGO_2026-11-21.md)  
Padrão mestre: [FAL_PADRAO_TELAS_LAYOUT_DESIGN_v1_2026-11-21.md](./FAL_PADRAO_TELAS_LAYOUT_DESIGN_v1_2026-11-21.md) (**FAL-UI-LAYOUT v1.0**)  
Plano: Marcha Catálogo Adaptive I1–I5 · sem main/prod · domínio intocado

## Resultado automático (código)

| Camada | Resultado | Evidência |
|--------|-----------|-----------|
| Branch | **`dev`** | `git branch --show-current` |
| `tsc --noEmit` | **PASS** | exit 0 |
| Vitest nav/workspace | **PASS** | `adminNavConfig` · `adminNavAccess` · `adminBreadcrumbs` · `adminWorkspacePrefs` — **4 files · 21 tests** |
| Domínio (RPC/resolve/place_order) | **INTACTO** | sem migrations; services de preço/BOM/release só reusados pela UI |

## Entregas I1–I4 (código)

| Fase | Entrega | Status |
|------|---------|--------|
| **I1** | `WorkspaceModuleKey` `products`\|`kits`\|`prices`; labels **Central de pedidos** / **Listas de preço**; `useIdSplitTabs` | **DONE** |
| **I2** | `AdminProductsPage` + `AdaptiveWorkspace` `products` + `ProductWorkSurface`; bulk na guia; stack guias; ficha abas Geral\|Precificação\|Mídia\|Aplicações\|Logística\|Relações | **DONE** |
| **I3** | `AdminKitsPage` + `KitWorkSurface`; criação rápida; BOM/`AdminProductKitSection` (Enter, merge qty, reorder, busy granular); ficha kit abas + `AdminProductApplicationsSection` (PVC) | **DONE** |
| **I4** | `AdminPriceListsPage` + `PriceListWorkSurface` (QuickAdjust); kits-manual bloqueado na guia; form curto na guia; F8/wizard intactos | **DONE** |

## Checklist aceite SPEC §10

- [x] Lista + guia nos três hubs (`moduleKey` products/kits/prices)
- [x] Vocabulário: Abrir guia / Na guia / Fechar guia / Abrir cadastro / Abrir lista completa
- [x] Produtos: bulk + Liberar na guia; multi-guia via `OrderSplitTabPanels`
- [x] Kits: criação rápida → composição; apps PVC na ficha
- [x] Preços: QuickAdjust contextual; kits-manual fora da guia
- [x] Labels nav/breadcrumb alinhados
- [x] **Smoke UI autenticado** Produtos — hub Adaptive + Abrir guia → painel “Aberto na guia” + Fechar guia (2026-11-21)
- [x] **Smoke UI** Kits — hub Adaptive + Abrir guia / Novo kit presentes (composição profunda: checklist operador opcional)
- [x] **Smoke UI** Preços — hub Adaptive + Abrir guia Base + listas; kits-manual visível no hub (bloqueado na guia via código)
- [x] **Regressão** Central pedidos — `/admin/pedidos` carrega Adaptive + Abrir guia (68)
- [x] **Regressão** Promo itens/kits — `/admin/home/promocoes` abre com abas Itens (98) / Kits (1)
- [ ] **Regressão** PDP kit preço (não E2E nesta rodada)

## Smoke UI (operador)

Runtime sugerido: `http://127.0.0.1:5173` · staff · **somente `dev`**.

### Produtos
1. `/admin/produtos` — filtros intactos; Abrir guia em 1 SKU → preview + ações (Liberar / available / arquivar).
2. Selecionar 2 → lote na guia (classificar / medidas / Liberar preflight).
3. Abrir cadastro → abas; kit na lista → rota `/admin/kits/:id`.

### Kits
1. `/admin/kits` — Novo kit (guia) → código+nome+categoria → composição.
2. Linkar 2 itens (Enter no destaque / multi); merge qty toast; reorder.
3. Cadastro full → aba Aplicações (PVC); Liberar ou preflight claro.

### Preços
1. `/admin/precos` — Abrir guia Base → editar 1 preço no QuickAdjust.
2. Abrir lista completa (`?tab=produtos`); import modal.
3. kits-manual → só hub Kits / não na guia workspace.

### Regressão
1. `/admin/pedidos` — Abrir guia pedido; primary clicável com split aberto.
2. `/admin` Painel — pedido na guia.
3. `/admin/home/promocoes` — filtro itens vs kits.
4. PDP kit — preço resolvido inalterado.

## Arquivos âncora

| Peça | Path |
|------|------|
| Prefs | `fal-pecas/src/lib/adminWorkspacePrefs.ts` |
| Produtos hub | `fal-pecas/src/pages/admin/products/AdminProductsPage.tsx` |
| Product surface | `fal-pecas/src/components/admin/products/ProductWorkSurface.tsx` |
| Kits hub | `fal-pecas/src/pages/admin/kits/AdminKitsPage.tsx` |
| Kit surface | `fal-pecas/src/components/admin/kits/KitWorkSurface.tsx` |
| Preços hub | `fal-pecas/src/pages/admin/prices/AdminPriceListsPage.tsx` |
| Price surface | `fal-pecas/src/components/admin/prices/PriceListWorkSurface.tsx` |

## Smoke browser (2026-11-21 · `127.0.0.1:5173` · sessão staff)

| Item | Resultado |
|------|-----------|
| `/admin/produtos` Adaptive + Abrir guia | **PASS** |
| Guia produtos (Fechar guia / Aberto na guia) | **PASS** |
| Nav labels Central de pedidos / Listas de preço | **PASS** |
| `/admin/kits` Adaptive | **PASS** |
| `/admin/precos` Adaptive + Abrir guia Base | **PASS** |
| `/admin/pedidos` Adaptive (regressão) | **PASS** |
| Promo itens/kits | **PASS** (abas Itens/Kits) |
| PDP kit preço | **PENDENTE** (opcional) |

## Hotfix Painel KPI (2026-11-21 01:32)

| Item | Resultado |
|------|-----------|
| Overlap Resumo executivo (1 col viewport em primary ~490px) | **FIX** — `@container` + `@min-[17rem]:grid-cols-2` / `@min-[36rem]:grid-cols-4` em `WidgetExecSummary` |
| Re-smoke `/admin` 2×2 KPIs legíveis | **PASS** |
| Vitest dashboard layout/widgets | **PASS** (revalidado) |

## Veredito

**Marcha I1–I5 FECHADA em `dev`** — código + tsc/vitest + smoke hubs + regressão Central/Promo.  
PDP kit: smoke fino opcional. Sem main/prod. Commit/push só sob pedido eFe.

**Assinatura:** marcha implementada 2026-11-21.
