import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import {
  ADMIN_WORKSPACE_KEY,
  WORKSPACE_VERSION,
  readModulePrefs,
  writeModulePrefs,
  type WorkspaceModuleKey,
} from '@/lib/adminWorkspacePrefs'

/**
 * FAL-UI-LAYOUT v1.5.2 — anti-regressão de telas / layout / design.
 * Contratos de fonte + prefs. Sem browser.
 * Doc: docs/planejamento/FAL_PADRAO_TELAS_LAYOUT_DESIGN_v1_2026-11-21.md
 */

/** HTML inválido: `<Link><Button>` — navegação deve ser Link + buttonClassName. */
const LINK_WRAPS_BUTTON = /<Link\b[^>]*>\s*<Button\b/

const root = resolve(__dirname, '../..')
const src = (...parts: string[]) => resolve(root, 'src', ...parts)
const read = (...parts: string[]) => readFileSync(src(...parts), 'utf8')

const MODULE_KEYS: WorkspaceModuleKey[] = [
  'orders',
  'dashboard',
  'products',
  'kits',
  'prices',
  'applications',
  'categories',
  'promotions',
  'inventory',
  'customers',
  'vehicles',
]

describe('FAL-UI-LAYOUT v1 antiregress (FL*)', () => {
  it('FL1: AdaptiveWorkspace + PanelChrome; hubs usam moduleKey', () => {
    const shell = read('components/admin/workspace/AdaptiveWorkspace.tsx')
    expect(shell).toMatch(/export function AdaptiveWorkspace/)
    expect(shell).toMatch(/PanelChrome/)
    expect(shell).toMatch(/data-workspace-primary/)
    expect(shell).toMatch(/WORKSPACE_SPLIT_MAX/)
    expect(shell).not.toMatch(/640px/)

    const chrome = read('components/admin/workspace/PanelChrome.tsx')
    expect(chrome).toMatch(/export function PanelChrome/)
    expect(chrome).toMatch(/onClose/)
    expect(chrome).toMatch(/Fechar painel/)
    expect(chrome).not.toMatch(/Estreita|Larga|onSplitWidthStep|Expandir|Tela cheia|Compacta/)

    expect(shell).toMatch(/role="separator"/)
    expect(shell).toMatch(/Arrastar para largura da guia/)
    expect(shell).toMatch(/cursor-col-resize/)
    expect(shell).toMatch(/clampSplitWidth/)
    expect(shell).toMatch(/data-workspace-panel="docked"/)

    const prefsSrc = read('lib/adminWorkspacePrefs.ts')
    expect(prefsSrc).toMatch(/WORKSPACE_SPLIT_MAX = 920/)
    expect(prefsSrc).toMatch(/WORKSPACE_SPLIT_STEP = 40/)
    expect(prefsSrc).toMatch(/WORKSPACE_SPLIT_MAX = (\d+)/)
    const maxMatch = prefsSrc.match(/WORKSPACE_SPLIT_MAX = (\d+)/)
    expect(Number(maxMatch?.[1] ?? 0)).toBeGreaterThanOrEqual(800)

    const hubs: Array<[string, WorkspaceModuleKey]> = [
      ['pages/admin/orders/AdminOrdersHubPage.tsx', 'orders'],
      ['pages/admin/AdminDashboardPage.tsx', 'dashboard'],
      ['pages/admin/products/AdminProductsPage.tsx', 'products'],
      ['pages/admin/kits/AdminKitsPage.tsx', 'kits'],
      ['pages/admin/prices/AdminPriceListsPage.tsx', 'prices'],
      ['pages/admin/products/AdminApplicationsPage.tsx', 'applications'],
      ['pages/admin/categories/AdminCategoriesPage.tsx', 'categories'],
      ['pages/admin/home/AdminPromotionsPage.tsx', 'promotions'],
      ['pages/admin/inventory/AdminInventoryPage.tsx', 'inventory'],
      ['pages/admin/customers/AdminCustomersPage.tsx', 'customers'],
      ['pages/admin/vehicles/AdminVehiclesPage.tsx', 'vehicles'],
    ]
    for (const [file, key] of hubs) {
      const body = read(file)
      expect(body).toMatch(/AdaptiveWorkspace/)
      expect(body).toContain(`moduleKey="${key}"`)
    }
  })

  it('FL2: prefs fal-admin-workspace-v1 + keys catálogo; selectedId não persiste', () => {
    expect(ADMIN_WORKSPACE_KEY).toBe('fal-admin-workspace-v1')
    expect(WORKSPACE_VERSION).toBe(1)

    const prefsSrc = read('lib/adminWorkspacePrefs.ts')
    for (const key of MODULE_KEYS) {
      expect(prefsSrc).toContain(`'${key}'`)
    }
    expect(prefsSrc).not.toMatch(/selectedProductId|selectedListId|selectedOrderId/)

    const mem: Record<string, string> = {}
    const storage = {
      getItem: (k: string) => mem[k] ?? null,
      setItem: (k: string, v: string) => {
        mem[k] = v
      },
      removeItem: (k: string) => {
        delete mem[k]
      },
    }
    writeModulePrefs(
      'products',
      { mode: 'split', splitWidthPx: 420, guideDensity: 'comfortable' },
      storage,
    )
    expect(readModulePrefs('products', storage).mode).toBe('split')
    expect(JSON.stringify(mem)).not.toMatch(/selectedProductId/)
  })

  it('FL3: data-workspace-primary compact|full no shell', () => {
    const shell = read('components/admin/workspace/AdaptiveWorkspace.tsx')
    expect(shell).toMatch(/data-workspace-primary=\{primaryCompact \? 'compact' : 'full'\}/)
  })

  it('FL4: CSS compact primary (orders+catálogo) + @container KPI Painel', () => {
    const css = read('styles/index.css')
    expect(css).toMatch(/\[data-workspace-primary='compact'\]/)
    expect(css).toMatch(/admin-orders-list-mobile|admin-orders-hub/)
    expect(css).toMatch(/admin-products-list-mobile/)
    expect(css).toMatch(/admin-kits-list-mobile/)
    expect(css).toMatch(/admin-products-list-desktop/)
    expect(css).toMatch(/admin-kits-list-desktop/)

    expect(read('pages/admin/products/AdminProductsPage.tsx')).toMatch(/admin-products-hub/)
    expect(read('pages/admin/kits/AdminKitsPage.tsx')).toMatch(/admin-kits-hub/)

    const widgets = read('components/admin/dashboard/widgets/DashboardWidgets.tsx')
    expect(widgets).toMatch(/@container/)
    expect(widgets).toMatch(/@min-\[17rem\]:grid-cols-2/)
    expect(widgets).toMatch(/WidgetExecSummary|function WidgetExecSummary/)
  })

  it('FL4b: BOM não mostra empty durante load; hint compact Enter', () => {
    const bom = read('components/admin/AdminProductKitSection.tsx')
    expect(bom).toMatch(/loadingBom/)
    expect(bom).toMatch(/Carregando composição/)
    expect(bom).toMatch(/Enter no destaque/)
  })

  it('FL5: vocabulário nav Central / Listas de preço; Abrir guia nos hubs', () => {
    const nav = read('lib/adminNavConfig.ts')
    expect(nav).toMatch(/Central de pedidos/)
    expect(nav).toMatch(/Listas de preço/)
    expect(nav).not.toMatch(/Listas de preços/)

    const pricesHub = read('pages/admin/prices/AdminPriceListsPage.tsx')
    expect(pricesHub).toMatch(/useDocumentTitle\('Listas de preço/)
    expect(pricesHub).toMatch(/>Listas de preço</)
    expect(pricesHub).not.toMatch(/Listas de preços/)

    expect(read('pages/admin/products/AdminProductFormPage.tsx')).toMatch(/Listas de preço/)
    expect(read('pages/admin/products/AdminProductFormPage.tsx')).not.toMatch(/Listas de preços/)
    expect(read('pages/admin/home/AdminHomePaymentSection.tsx')).toMatch(/Listas de preço/)
    expect(read('pages/admin/home/AdminHomePaymentSection.tsx')).not.toMatch(/Listas de preços/)
    expect(read('pages/admin/suppliers/AdminSupplierCostImportPage.tsx')).toMatch(/Listas de preço/)
    expect(read('pages/admin/suppliers/AdminSupplierCostImportPage.tsx')).not.toMatch(
      /Listas de preços/,
    )

    for (const file of [
      'pages/admin/products/AdminProductsPage.tsx',
      'pages/admin/kits/AdminKitsPage.tsx',
      'pages/admin/prices/AdminPriceListsPage.tsx',
    ]) {
      expect(read(file)).toMatch(/Abrir guia/)
    }
  })

  it('FL6: WorkSurfaces Product / Kit / PriceList / Application / Category / Promotion / Inventory / Customer', () => {
    expect(read('components/admin/products/ProductWorkSurface.tsx')).toMatch(
      /export function ProductWorkSurface/,
    )
    expect(read('components/admin/kits/KitWorkSurface.tsx')).toMatch(
      /export function KitWorkSurface/,
    )
    expect(read('components/admin/prices/PriceListWorkSurface.tsx')).toMatch(
      /export function PriceListWorkSurface/,
    )
    expect(read('components/admin/applications/ApplicationWorkSurface.tsx')).toMatch(
      /export function ApplicationWorkSurface/,
    )
    expect(read('components/admin/applications/ProductApplicationsEditor.tsx')).toMatch(
      /export function ProductApplicationsEditor/,
    )
    expect(read('components/admin/categories/CategoryWorkSurface.tsx')).toMatch(
      /export function CategoryWorkSurface/,
    )
    expect(read('components/admin/promotions/PromotionWorkSurface.tsx')).toMatch(
      /export function PromotionWorkSurface/,
    )
    expect(read('components/admin/inventory/InventoryWorkSurface.tsx')).toMatch(
      /export function InventoryWorkSurface/,
    )
    expect(read('components/admin/customers/CustomerWorkSurface.tsx')).toMatch(
      /export function CustomerWorkSurface/,
    )
  })

  it('FL7: tokens --fal-* + .dark', () => {
    const css = read('styles/index.css')
    expect(css).toMatch(/--fal-fg:/)
    expect(css).toMatch(/--fal-bg:/)
    expect(css).toMatch(/--fal-surface:/)
    expect(css).toMatch(/--fal-accent:/)
    expect(css).toMatch(/\.dark\s*\{/)
    expect(css).toMatch(/--color-fal-fg:\s*var\(--fal-fg\)/)
  })

  it('FL8: workspace ortogonal ao RGL do Painel', () => {
    const prefs = read('lib/adminWorkspacePrefs.ts')
    expect(prefs).toMatch(/fal-admin-dashboard-layout/)
    expect(prefs).toMatch(/Ortogonal|ortogonal|Nunca escrever/i)
  })

  it('FL9: AdminTabs nas fichas produto e kit', () => {
    const product = read('pages/admin/products/AdminProductFormPage.tsx')
    expect(product).toMatch(/AdminTabs/)
    expect(product).toMatch(/Precificação/)
    expect(product).toMatch(/Aplicações/)

    const kit = read('pages/admin/kits/AdminKitFormPage.tsx')
    expect(kit).toMatch(/AdminTabs/)
    expect(kit).toMatch(/Composição/)
    expect(kit).toMatch(/Aplicações/)
    expect(kit).toMatch(/AdminProductApplicationsSection/)
  })

  it('FL10: kits-manual bloqueado na guia de preços; 1 CTA → /admin/kits/precos', () => {
    const surface = read('components/admin/prices/PriceListWorkSurface.tsx')
    expect(surface).toMatch(/isKitsManualPriceList/)
    expect(surface).toMatch(/priceListsForWorkspaceGuide|PRICE_LIST_KITS_MANUAL/)

    const page = read('pages/admin/prices/AdminPriceListsPage.tsx')
    expect(page).toMatch(/isKitsManualPriceList/)
    expect(page).toMatch(/guideLists/)
    expect(page).toMatch(/to="\/admin\/kits\/precos"/)
    expect(page).toMatch(/Preços dos kits/)
    expect(page).not.toMatch(/Gerir no hub Kits/)
    expect(page).not.toMatch(/>Hub Kits</)
  })

  it('FL11: hubs Adaptive sem Link wrapping Button; WorkSurfaces usam buttonClassName', () => {
    const hubFiles = [
      'pages/admin/products/AdminProductsPage.tsx',
      'pages/admin/kits/AdminKitsPage.tsx',
      'pages/admin/prices/AdminPriceListsPage.tsx',
      'pages/admin/products/AdminApplicationsPage.tsx',
      'pages/admin/categories/AdminCategoriesPage.tsx',
      'pages/admin/home/AdminPromotionsPage.tsx',
      'pages/admin/inventory/AdminInventoryPage.tsx',
      'pages/admin/customers/AdminCustomersPage.tsx',
      'components/admin/products/ProductWorkSurface.tsx',
      'components/admin/kits/KitWorkSurface.tsx',
      'components/admin/prices/PriceListWorkSurface.tsx',
      'components/admin/applications/ApplicationWorkSurface.tsx',
      'components/admin/categories/CategoryWorkSurface.tsx',
      'components/admin/promotions/PromotionWorkSurface.tsx',
      'components/admin/inventory/InventoryWorkSurface.tsx',
      'components/admin/customers/CustomerWorkSurface.tsx',
      'pages/admin/kits/AdminKitFormPage.tsx',
    ]
    for (const file of hubFiles) {
      expect(read(file), file).not.toMatch(LINK_WRAPS_BUTTON)
    }
    for (const file of [
      'components/admin/products/ProductWorkSurface.tsx',
      'components/admin/kits/KitWorkSurface.tsx',
      'components/admin/prices/PriceListWorkSurface.tsx',
      'components/admin/applications/ProductApplicationsEditor.tsx',
    ]) {
      expect(read(file)).toMatch(/buttonClassName/)
    }
  })

  it('FL12: guia preços embutida sem CTA Abrir lista completa duplicado; kit form Preços só na aba', () => {
    const quick = read('pages/admin/prices/PriceListQuickAdjustPanel.tsx')
    expect(quick).toMatch(/embedded/)
    expect(quick).toMatch(/!embedded && effectiveListId/)
    expect(quick).toMatch(/!embedded && onRequestImport/)

    const kitForm = read('pages/admin/kits/AdminKitFormPage.tsx')
    expect(kitForm).toMatch(/showPricesLink = false/)
    // Única ativação do CTA no JSX: aba Precificação
    const jsxEnable = kitForm.match(/^\s+showPricesLink\s*$/gm) ?? []
    expect(jsxEnable.length).toBe(1)
    expect(kitForm).toMatch(
      /formTab === 'precificacao'[\s\S]*?showPricesLink[\s\S]*?\{formTab === 'composicao'/,
    )
  })

  it('FL14: Produtos filtros compactos / expansíveis (sem poluir lista)', () => {
    const page = read('pages/admin/products/AdminProductsPage.tsx')
    expect(page).toMatch(/admin-products-filters/)
    expect(page).toMatch(/data-filters-expanded/)
    expect(page).toMatch(/filtersExpanded/)
    expect(page).toMatch(/Mais filtros|Recolher filtros/)
    expect(page).toMatch(/fal\.products\.filtersExpanded/)
    expect(page).toMatch(/filterChips/)
  })

  it('FL13: Kits hub distingue Novo na guia vs Cadastro completo; rotas canônicas', () => {
    const kits = read('pages/admin/kits/AdminKitsPage.tsx')
    expect(kits).toMatch(/Novo na guia/)
    expect(kits).toMatch(/Cadastro completo/)
    expect(kits).toMatch(/to="\/admin\/kits\/novo"/)
    expect(kits).toMatch(/to="\/admin\/kits\/precos"/)
    expect(kits).toMatch(/to="\/admin\/produtos\/importar-kits"/)
    expect(kits).toMatch(/contextualTitle=\{[\s\S]*\? 'Novo na guia'/)
    expect(kits).not.toMatch(/Novo \(página\)/)

    const kitSurface = read('components/admin/kits/KitWorkSurface.tsx')
    expect(kitSurface).toMatch(/data-kit-guide-menus|Mini-menus da guia do kit/)
    expect(kitSurface).toMatch(/fal\.kits\.guideMenu|KIT_GUIDE_MENU_KEY/)
    expect(kitSurface).toMatch(/surfacePart="bom"/)
    expect(kitSurface).toMatch(/surfacePart="pricing"/)
    expect(kitSurface).toMatch(/ProductApplicationsEditor/)
    expect(kitSurface).toMatch(/Salvar identidade/)
    expect(kitSurface).toMatch(/parseKitGuideSectionParam|\?section=/)

    const productSurface = read('components/admin/products/ProductWorkSurface.tsx')
    expect(productSurface).toMatch(/to="\/admin\/precos"/)
    expect(productSurface).toMatch(/`\/admin\/kits\/\$\{focused\.id\}`/)
    expect(productSurface).toMatch(/`\/admin\/produtos\/\$\{focused\.id\}`/)
  })

  it('FL15: guia Produto rica — foto, preço/categoria, apps, kits, relacionados, + Guia', () => {
    const surface = read('components/admin/products/ProductWorkSurface.tsx')
    expect(surface).toMatch(/adminPrimaryImageUrlMap/)
    // G2: multi-lista + modal de precificação (custo/margem/preço)
    expect(surface).toMatch(/adminGetProductPricingRows|PriceItemPricingModal/)
    expect(surface).toMatch(/adminSetPriceListItemPricing|adminSetCalculatedListPrice/)
    expect(surface).toMatch(/Abrir hub de listas/)
    expect(surface).toMatch(/Salvar categoria/)
    // G3: editor PVC embutido (Trocar veículo / modelo·motor·versão)
    expect(surface).toMatch(/ProductApplicationsEditor/)
    expect(surface).toMatch(/variant="embedded"/)
    expect(surface).toMatch(/adminListApplications/)
    expect(surface).not.toMatch(/G3: surface completa/)
    expect(surface).toMatch(/adminListKitsUsingProduct/)
    expect(surface).toMatch(/adminListProductRelated/)
    expect(surface).toMatch(/KITS_OPEN_GUIDE_KEY|fal\.kits\.openGuideId/)
    expect(surface).toMatch(/\+ Guia/)
    // G1 mini-menus (um painel ativo) — substitui accordion Expandir/Recolher
    expect(surface).toMatch(/data-product-guide-menus|Mini-menus da guia/)
    expect(surface).toMatch(/fal\.products\.guideMenu|PRODUCT_GUIDE_MENU_KEY/)
    expect(surface).toMatch(/parseProductGuideSectionParam|\?section=|sectionFromUrl/)

    const products = read('pages/admin/products/AdminProductsPage.tsx')
    expect(products).toMatch(/\+ Guia/)
    expect(products).toMatch(/onOpenProductGuide|openRelatedInGuide/)
    const guideUpdateIdx = products.indexOf('function onGuideProductUpdated')
    expect(guideUpdateIdx).toBeGreaterThan(-1)
    const guideUpdateSnippet = products.slice(guideUpdateIdx, guideUpdateIdx + 280)
    expect(guideUpdateSnippet).toMatch(/setItems/)
    expect(guideUpdateSnippet).not.toMatch(/void reload\(/)

    const kits = read('pages/admin/kits/AdminKitsPage.tsx')
    expect(kits).toMatch(/KITS_OPEN_GUIDE_KEY/)
    expect(kits).toMatch(/\+ Guia/)

    const prices = read('pages/admin/prices/AdminPriceListsPage.tsx')
    expect(prices).toMatch(/\+ Guia/)
  })

  it('FL16: hub Aplicações Adaptive moduleKey applications', () => {
    const page = read('pages/admin/products/AdminApplicationsPage.tsx')
    expect(page).toMatch(/AdaptiveWorkspace/)
    expect(page).toContain('moduleKey="applications"')
    expect(page).toMatch(/admin-applications-hub/)
    expect(page).toMatch(/admin-applications-list-mobile/)
    expect(page).toMatch(/admin-applications-list-desktop/)
    expect(page).toMatch(/admin-applications-filters/)
    expect(page).toMatch(/Mais filtros|Recolher filtros/)
    expect(page).toMatch(/fal\.applications\.filtersExpanded/)
    expect(page).toMatch(/\+ Guia/)

    const css = read('styles/index.css')
    expect(css).toMatch(/admin-applications-list-mobile/)
  })

  it('FL17: ProductApplicationsEditor — guia centrada no item; sem form mid-page permanente', () => {
    const editor = read('components/admin/applications/ProductApplicationsEditor.tsx')
    expect(editor).toMatch(/export function ProductApplicationsEditor/)
    expect(editor).toMatch(/adminUpdateApplicationYears/)
    expect(editor).toMatch(/adminUpdateApplicationVehicleVersion/)
    expect(editor).toMatch(/adminAddApplicationsBulk/)
    expect(editor).toMatch(/Adicionar à fila/)
    expect(editor).toMatch(/Vincular fila/)
    expect(editor).toMatch(/Cadastro completo/)
    expect(editor).toMatch(/PRODUCTS_OPEN_GUIDE_KEY/)

    const surface = read('components/admin/applications/ApplicationWorkSurface.tsx')
    expect(surface).toMatch(/export function ApplicationWorkSurface/)
    expect(surface).toMatch(/Nova aplicação na guia|mode === 'create'/)
    expect(surface).toMatch(/onOpenProduct/)
    expect(surface).toMatch(/adminFindProductIdBySku/)

    const page = read('pages/admin/products/AdminApplicationsPage.tsx')
    expect(page).toMatch(/ProductApplicationsEditor/)
    expect(page).toMatch(/ApplicationWorkSurface/)
    expect(page).toMatch(/openProductGuide|openCreate/)
    // Criar só via guia (sem formulário permanente no primary)
    expect(page).not.toMatch(/Fechar formulário/)
    expect(page).not.toMatch(/ring-2 ring-fal-yellow/)
    expect(page).toMatch(/Produto \(ficha\)|productIdFilter/)
    expect(page).toMatch(/clearAllFilters|clearProductIdFilter/)

    const productSurface = read('components/admin/products/ProductWorkSurface.tsx')
    expect(productSurface).toMatch(/ProductApplicationsEditor/)
    expect(productSurface).toMatch(/variant="embedded"/)
  })

  it('FL18: pontes guia↔guia Produto ↔ Aplicações ↔ Kits', () => {
    const bridges = read('lib/adminGuideBridges.ts')
    expect(bridges).toMatch(/PRODUCTS_OPEN_GUIDE_KEY/)
    expect(bridges).toMatch(/APPLICATIONS_OPEN_GUIDE_KEY/)
    expect(bridges).toMatch(/KITS_OPEN_GUIDE_KEY/)
    expect(bridges).toMatch(/consumeGuideBridge/)

    expect(read('components/admin/applications/ProductApplicationsEditor.tsx')).toMatch(
      /PRODUCTS_OPEN_GUIDE_KEY/,
    )
    // Guia produto embute o editor (não precisa mais da ponte só para editar PVC)
    expect(read('components/admin/products/ProductWorkSurface.tsx')).toMatch(
      /ProductApplicationsEditor/,
    )
    expect(read('pages/admin/products/AdminProductsPage.tsx')).toMatch(/PRODUCTS_OPEN_GUIDE_KEY/)
    expect(read('pages/admin/products/AdminApplicationsPage.tsx')).toMatch(
      /APPLICATIONS_OPEN_GUIDE_KEY/,
    )
  })

  it('FL19: cascata PVC compartilhada hub↔ficha (pvcVehicleCascade)', () => {
    const lib = read('lib/pvcVehicleCascade.ts')
    expect(lib).toMatch(/export function pvcEngineOptions/)
    expect(lib).toMatch(/export function pvcVersionNameOptions/)
    expect(lib).toMatch(/export function pvcMatchingVersions/)
    expect(lib).toMatch(/PVC_CASCADE_HINT/)

    expect(read('components/admin/applications/ProductApplicationsEditor.tsx')).toMatch(
      /pvcMatchingVersions|pvcEngineOptions/,
    )
    expect(read('components/admin/AdminProductApplicationsSection.tsx')).toMatch(
      /ProductApplicationsEditor/,
    )
    expect(read('pages/admin/products/AdminApplicationsPage.tsx')).toMatch(/pvcEngineOptions/)
    expect(read('components/admin/applications/ProductApplicationsEditor.tsx')).toMatch(
      /Hub Aplicações/,
    )
  })

  it('FL20: Hub Classificação Adaptive — CategoryWorkSurface; sem form mid-page', () => {
    const page = read('pages/admin/categories/AdminCategoriesPage.tsx')
    expect(page).toMatch(/AdaptiveWorkspace/)
    expect(page).toContain('moduleKey="categories"')
    expect(page).toMatch(/CategoryWorkSurface/)
    expect(page).toMatch(/admin-categories-hub/)
    expect(page).toMatch(/guideOpen/)
    // Form só na guia (não permanente no primary)
    expect(page).not.toMatch(/<CategoriesEditorForm/)
    expect(page).toMatch(/Abrir guia|startEdit|startCreate/)
    expect(page).toMatch(/confirmLeaveDirtyGuide/)
    expect(page).toMatch(/max-h-\[min\(60dvh,640px\)\]/)

    const surface = read('components/admin/categories/CategoryWorkSurface.tsx')
    expect(surface).toMatch(/export function CategoryWorkSurface/)
    expect(surface).toMatch(/CategoriesEditorForm/)
    expect(surface).toMatch(/Fechar guia/)
    expect(surface).toMatch(/Nova categoria na guia|na guia/)

    const browse = read('components/admin/categories/CategoriesBrowsePanel.tsx')
    expect(browse).toMatch(/Abrir guia/)
    expect(browse).toMatch(/Na guia/)
    expect(browse).toMatch(/admin-categories-list-mobile/)
    expect(browse).toMatch(/admin-categories-list-desktop/)
    expect(browse).toMatch(/bg-fal-yellow/)

    const css = read('styles/index.css')
    expect(css).toMatch(/admin-categories-hub/)
    expect(css).toMatch(/admin-categories-list-mobile/)
  })

  it('FL21: polish P0 — lote Produtos via barra; chips Editar Apps; CTA guia', () => {
    const products = read('pages/admin/products/AdminProductsPage.tsx')
    expect(products).toMatch(/Alterações em lote na guia/)
    expect(products).not.toMatch(
      /if \(selected\.size > 0 \|\| releasePreflight\) setLoteGuiaOpen\(true\)/,
    )
    expect(products).toMatch(/bg-fal-yellow/)

    const apps = read('pages/admin/products/AdminApplicationsPage.tsx')
    expect(apps).toMatch(/Editar/)
    expect(apps).toMatch(/Abrir cadastro/)
    expect(apps).toMatch(/bg-fal-yellow/)
  })

  it('FL22: Hub Promoções Adaptive — PromotionWorkSurface; sem form mid-page', () => {
    const page = read('pages/admin/home/AdminPromotionsPage.tsx')
    expect(page).toMatch(/AdaptiveWorkspace/)
    expect(page).toContain('moduleKey="promotions"')
    expect(page).toMatch(/PromotionWorkSurface/)
    expect(page).toMatch(/admin-promotions-hub/)
    expect(page).toMatch(/Incluir na guia/)
    expect(page).not.toMatch(/1\. Incluir \/ ativar/)
    expect(page).toMatch(/fal\.promotions\.filtersExpanded/)
    expect(page).toMatch(/Mais filtros|Recolher filtros/)

    const surface = read('components/admin/promotions/PromotionWorkSurface.tsx')
    expect(surface).toMatch(/export function PromotionWorkSurface/)
    expect(surface).toMatch(/adminActivatePromotion/)
    expect(surface).toMatch(/Fechar guia/)
    expect(surface).toMatch(/Incluir e ativar/)

    const css = read('styles/index.css')
    expect(css).toMatch(/admin-promotions-hub/)
    expect(css).toMatch(/admin-promotions-list-mobile/)
  })

  it('FL23: Hub Estoque Adaptive — InventoryWorkSurface; sem painel mid-page', () => {
    const page = read('pages/admin/inventory/AdminInventoryPage.tsx')
    expect(page).toMatch(/AdaptiveWorkspace/)
    expect(page).toContain('moduleKey="inventory"')
    expect(page).toMatch(/InventoryWorkSurface/)
    expect(page).toMatch(/admin-inventory-hub/)
    expect(page).toMatch(/Abrir guia/)
    expect(page).toMatch(/Na guia/)
    expect(page).not.toMatch(/lg:grid-cols-2/)
    expect(page).not.toMatch(/Selecione um produto para ver movimentos/)

    const surface = read('components/admin/inventory/InventoryWorkSurface.tsx')
    expect(surface).toMatch(/export function InventoryWorkSurface/)
    expect(surface).toMatch(/adjustInventory/)
    expect(surface).toMatch(/Fechar guia/)
    expect(surface).toMatch(/\+ Entrada/)

    const css = read('styles/index.css')
    expect(css).toMatch(/admin-inventory-hub/)
    expect(css).toMatch(/admin-inventory-list-mobile/)
  })

  it('FL24: Hub Clientes Adaptive — CustomerWorkSurface; sem painel mid-page', () => {
    const page = read('pages/admin/customers/AdminCustomersPage.tsx')
    expect(page).toMatch(/AdaptiveWorkspace/)
    expect(page).toContain('moduleKey="customers"')
    expect(page).toMatch(/CustomerWorkSurface/)
    expect(page).toMatch(/admin-customers-hub/)
    expect(page).toMatch(/Abrir guia/)
    expect(page).toMatch(/Na guia/)
    expect(page).not.toMatch(/lg:grid-cols-2/)
    expect(page).not.toMatch(/Selecione um cliente/)

    const surface = read('components/admin/customers/CustomerWorkSurface.tsx')
    expect(surface).toMatch(/export function CustomerWorkSurface/)
    expect(surface).toMatch(/adminSetCustomerAssignedPriceList/)
    expect(surface).toMatch(/Fechar guia/)
    expect(surface).toMatch(/Pedidos recentes/)

    const css = read('styles/index.css')
    expect(css).toMatch(/admin-customers-hub/)
    expect(css).toMatch(/admin-customers-list-mobile/)
  })

  it('FL25: Revisão no Hub Adaptive (fila canônica + lista + CTAs)', () => {
    const queues = read('lib/adminLogisticsQueues.ts')
    expect(queues).toMatch(/id: 'revisao'/)
    expect(queues).toMatch(/tab=logistica&fila=revisao/)

    const hub = read('pages/admin/orders/AdminOrdersHubPage.tsx')
    expect(hub).toMatch(/REVISAO_CHIPS/)
    expect(hub).toMatch(/columnMode=\{isRevisaoFila \? 'revisao' : 'default'\}/)
    expect(hub).toMatch(/selectedStageLabel/)
    expect(hub).toMatch(/rememberGuideStage/)

    const list = read('pages/admin/orders/AdminOrdersListPanel.tsx')
    expect(list).toMatch(/columnMode\?: AdminOrdersListColumnMode/)
    expect(list).toMatch(/Modo \/ código/)

    const view = read('pages/admin/orders/AdminOrdersViewPage.tsx')
    expect(view).toMatch(/Navigate/)
    expect(view).toMatch(/revisao-logistica/)

    const ops = read('components/admin/orders/OrderOpsSurface.tsx')
    expect(ops).toMatch(/PostSaleCaseQuickActions/)
    expect(ops).toMatch(/Caso pós-venda aberto/)
    expect(ops).toMatch(/onOrderChangeRef/)
  })

  it('FL26: guia Preços Custo|Margem|Preço + edição híbrida; paridade lista', () => {
    const quick = read('pages/admin/prices/PriceListQuickAdjustPanel.tsx')
    expect(quick).toMatch(/Margem/)
    expect(quick).toMatch(/effectiveMarginPct|liveMarginPct/)
    expect(quick).toMatch(/onDoubleClick/)
    expect(quick).toMatch(/e\.key === 'Enter' \|\| e\.key === 'F2'/)
    expect(quick).toMatch(/startInlinePrice|commitInlinePrice/)
    expect(quick).toMatch(/openPricingModal/)
    expect(quick).toMatch(/Editar/)
    expect(quick).toMatch(/embedded/)

    const products = read('components/admin/prices/PriceListProductsTab.tsx')
    expect(products).toMatch(/effectiveMarginPct/)
    expect(products).toMatch(/onDoubleClick/)
    expect(products).toMatch(/e\.key === 'Enter' \|\| e\.key === 'F2'/)
  })

  it('FL28: guia desktop in-flow sticky (sem fixed+spacer / sem buraco)', () => {
    const shell = read('components/admin/workspace/AdaptiveWorkspace.tsx')
    expect(shell).toMatch(/data-workspace-panel="docked"/)
    expect(shell).toMatch(/data-workspace-layout=\{/)
    expect(shell).toMatch(/WORKSPACE_ADMIN_HEADER/)
    expect(shell).toMatch(/WORKSPACE_PANEL_STICKY_TOP/)
    expect(shell).toMatch(/sticky self-start/)
    expect(shell).toMatch(/-mr-3.*md:-mr-6/)
    expect(shell).toMatch(/width: splitWidth/)
    expect(shell).not.toMatch(/data-workspace-spacer/)
    // Desktop docked NÃO usa fixed (só overlay mobile/fullscreen)
    expect(shell).toMatch(/data-workspace-panel="overlay"/)
    const dockedBlock = shell.slice(
      shell.indexOf('data-workspace-panel="docked"'),
      shell.indexOf('data-workspace-panel="docked"') + 800,
    )
    expect(dockedBlock).not.toMatch(/\bfixed\b/)
  })

  it('FL27: Adaptive resize por arraste; chrome só Fechar; Garagem nav in-place', () => {
    const prefs = read('lib/adminWorkspacePrefs.ts')
    expect(prefs).toMatch(/guideDensity/)
    expect(prefs).toMatch(/WORKSPACE_SPLIT_PRESET_NARROW = 420/)
    expect(prefs).toMatch(/WORKSPACE_SPLIT_PRESET_WIDE = 720/)

    const chrome = read('components/admin/workspace/PanelChrome.tsx')
    expect(chrome).toMatch(/min-h-11/)
    expect(chrome).toMatch(/onClose/)
    expect(chrome).not.toMatch(/Estreita|Larga|onSplitWidthPreset|onGuideDensityChange/)
    expect(chrome).not.toMatch(/Expandir|Tela cheia|Compacta/)

    const shell = read('components/admin/workspace/AdaptiveWorkspace.tsx')
    expect(shell).toMatch(/data-guide-density/)
    expect(shell).toMatch(/role="separator"/)
    expect(shell).toMatch(/onSplitterPointerDown/)
    expect(shell).toMatch(/onSplitterKeyDown/)
    expect(shell).toMatch(/overflow-visible/)
    expect(shell).toMatch(/modeApiRef/)
    expect(shell).not.toMatch(/onSplitWidthStep|onSplitWidthPreset|setGuideDensity/)

    const garage = read('components/garage/GarageShell.tsx')
    expect(garage).toMatch(/goGarageHome/)
    expect(garage).toMatch(/Todos os veículos/)
    expect(garage).toMatch(/modulo=visao|lastModule: 'visao'/)

    const detail = read('pages/Account/AccountVehicleDetailPage.tsx')
    expect(detail).toMatch(/lg:hidden/)
    expect(detail).toMatch(/data-garage-nav-axis="mobile-chips"/)
    expect(detail).not.toMatch(/Abrir visualização 3D/)
  })

  it('FL20: OrderOps tabs touch + radius; PanelChrome ≥44px; Home nested rounded-fal', () => {
    const ops = read('components/admin/orders/OrderOpsSurface.tsx')
    expect(ops).toMatch(/role="tablist"/)
    expect(ops).toMatch(/min-h-11 flex-1 rounded-\[10px\]/)
    expect(ops).toMatch(/rounded-fal border border-fal-line bg-fal-bg p-1/)
    expect(ops).not.toMatch(/min-h-8 flex-1 rounded-\[8px\]/)
    expect(ops).toMatch(/setTab\(postSale \? 'logistica' : 'geral'\)/)

    const chrome = read('components/admin/workspace/PanelChrome.tsx')
    expect(chrome).toMatch(/min-h-11/)
    expect(chrome).not.toMatch(/min-h-9/)

    const trust = read('components/home/HomeTrustSection.tsx')
    expect(trust).toMatch(/rounded-fal border border-fal-line border-l-4/)
    expect(trust).not.toMatch(/rounded-\[12px\]/)

    const vehicles = read('components/home/HomeVehiclesPanel.tsx')
    expect(vehicles).toMatch(/rounded-fal border border-fal-line bg-fal-bg px-4 py-5/)

    const carousel = read('components/home/ProductCarousel.tsx')
    expect(carousel).toMatch(/min-h-11 min-w-11/)

    const promo = read('pages/admin/home/AdminPromotionsPage.tsx')
    expect(promo).toMatch(/border-fal-warning\/50 bg-fal-warning\/15/)
    expect(promo).not.toMatch(/border-amber-300 bg-amber-50/)

    const quick = read('components/admin/orders/PostSaleCaseQuickActions.tsx')
    expect(quick).toMatch(/Mensagem do cliente/)
    expect(quick).toMatch(/POST_SALE_MOTIVES/)
    expect(quick).toMatch(/variant="primary"/)

    // Hierarquia Logística: ações antes do contexto Ida×devolução
    const logisticaBlock = ops.slice(ops.indexOf('aria-label="Logística"'))
    const iQuick = logisticaBlock.indexOf('<PostSaleCaseQuickActions')
    const iIda = logisticaBlock.indexOf('<PostSaleReturnLogisticsPanel')
    expect(iQuick).toBeGreaterThanOrEqual(0)
    expect(iIda).toBeGreaterThan(iQuick)

    const ida = read('components/admin/orders/PostSaleReturnLogisticsPanel.tsx')
    expect(ida).toMatch(/text-\[11px\] font-bold uppercase/)
    expect(ida).not.toMatch(/<h2/)
    expect(ida).not.toMatch(/cart_item_id/)
    expect(ida).not.toMatch(/live-ready/)
    expect(ida).toMatch(/Ref\. envio/)

    // P2: não repetir rastreio da ida em Frete quando já está no painel acima
    expect(logisticaBlock).toMatch(/Rastreio da ida no bloco Ida/)
    expect(logisticaBlock).toMatch(/returnLogistics\?\.outboundTracking/)
  })

  it('FL29: ProductCard — stepper ± do carrinho (não só chip “No carrinho: N”)', () => {
    const card = read('components/product/ProductCard.tsx')
    expect(card).toMatch(/data-testid="product-card-cart-qty"/)
    expect(card).toMatch(/data-testid="product-card-cart-dec"/)
    expect(card).toMatch(/data-testid="product-card-cart-inc"/)
    expect(card).toMatch(/updateQty\(product\.id, cartQty - 1\)/)
    expect(card).not.toMatch(/No carrinho:\s*\{cartQty\}/)
  })
})
