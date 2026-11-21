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
 * FAL-UI-LAYOUT v1.4.0 — anti-regressão de telas / layout / design.
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
]

describe('FAL-UI-LAYOUT v1 antiregress (FL*)', () => {
  it('FL1: AdaptiveWorkspace + PanelChrome; hubs usam moduleKey', () => {
    const shell = read('components/admin/workspace/AdaptiveWorkspace.tsx')
    expect(shell).toMatch(/export function AdaptiveWorkspace/)
    expect(shell).toMatch(/PanelChrome/)
    expect(shell).toMatch(/data-workspace-primary/)

    const chrome = read('components/admin/workspace/PanelChrome.tsx')
    expect(chrome).toMatch(/export function PanelChrome/)

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
    writeModulePrefs('products', { mode: 'split', splitWidthPx: 420 }, storage)
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

  it('FL6: WorkSurfaces Product / Kit / PriceList / Application / Category / Promotion / Inventory', () => {
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
    expect(read('components/admin/categories/CategoryWorkSurface.tsx')).toMatch(
      /export function CategoryWorkSurface/,
    )
    expect(read('components/admin/promotions/PromotionWorkSurface.tsx')).toMatch(
      /export function PromotionWorkSurface/,
    )
    expect(read('components/admin/inventory/InventoryWorkSurface.tsx')).toMatch(
      /export function InventoryWorkSurface/,
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
      'components/admin/products/ProductWorkSurface.tsx',
      'components/admin/kits/KitWorkSurface.tsx',
      'components/admin/prices/PriceListWorkSurface.tsx',
      'components/admin/applications/ApplicationWorkSurface.tsx',
      'components/admin/categories/CategoryWorkSurface.tsx',
      'components/admin/promotions/PromotionWorkSurface.tsx',
      'components/admin/inventory/InventoryWorkSurface.tsx',
      'pages/admin/kits/AdminKitFormPage.tsx',
    ]
    for (const file of hubFiles) {
      expect(read(file), file).not.toMatch(LINK_WRAPS_BUTTON)
    }
    for (const file of [
      'components/admin/products/ProductWorkSurface.tsx',
      'components/admin/kits/KitWorkSurface.tsx',
      'components/admin/prices/PriceListWorkSurface.tsx',
      'components/admin/applications/ApplicationWorkSurface.tsx',
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

    const productSurface = read('components/admin/products/ProductWorkSurface.tsx')
    expect(productSurface).toMatch(/to="\/admin\/precos"/)
    expect(productSurface).toMatch(/`\/admin\/kits\/\$\{focused\.id\}`/)
    expect(productSurface).toMatch(/`\/admin\/produtos\/\$\{focused\.id\}`/)
  })

  it('FL15: guia Produto rica — foto, preço/categoria, apps, kits, relacionados, + Guia', () => {
    const surface = read('components/admin/products/ProductWorkSurface.tsx')
    expect(surface).toMatch(/adminPrimaryImageUrlMap/)
    expect(surface).toMatch(/Salvar preço|Preço \(Lista Base\)/)
    expect(surface).toMatch(/Salvar categoria/)
    expect(surface).toMatch(/adminListApplications/)
    expect(surface).toMatch(/adminListKitsUsingProduct/)
    expect(surface).toMatch(/adminListProductRelated/)
    expect(surface).toMatch(/KITS_OPEN_GUIDE_KEY|fal\.kits\.openGuideId/)
    expect(surface).toMatch(/\+ Guia/)
    expect(surface).toMatch(/Expandir|Recolher/)

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

  it('FL17: ApplicationWorkSurface — criar/editar na guia; sem form mid-page permanente', () => {
    const surface = read('components/admin/applications/ApplicationWorkSurface.tsx')
    expect(surface).toMatch(/export function ApplicationWorkSurface/)
    expect(surface).toMatch(/adminUpdateApplicationYears/)
    expect(surface).toMatch(/adminUpdateApplicationVehicleVersion/)
    expect(surface).toMatch(/adminAddApplicationsBulk/)
    expect(surface).toMatch(/Nova aplicação na guia|mode === 'create'/)
    expect(surface).toMatch(/Cadastro completo/)
    expect(surface).toMatch(/PRODUCTS_OPEN_GUIDE_KEY/)

    const page = read('pages/admin/products/AdminApplicationsPage.tsx')
    expect(page).toMatch(/ApplicationWorkSurface/)
    expect(page).toMatch(/openCreate/)
    // Criar só via guia (sem formulário permanente no primary)
    expect(page).not.toMatch(/Fechar formulário/)
    expect(page).not.toMatch(/ring-2 ring-fal-yellow/)
    expect(page).toMatch(/Produto \(ficha\)|productIdFilter/)
    expect(page).toMatch(/clearAllFilters|clearProductIdFilter/)

    const productSurface = read('components/admin/products/ProductWorkSurface.tsx')
    expect(productSurface).toMatch(/\/admin\/aplicacoes\?q=/)
  })

  it('FL18: pontes guia↔guia Produto ↔ Aplicações ↔ Kits', () => {
    const bridges = read('lib/adminGuideBridges.ts')
    expect(bridges).toMatch(/PRODUCTS_OPEN_GUIDE_KEY/)
    expect(bridges).toMatch(/APPLICATIONS_OPEN_GUIDE_KEY/)
    expect(bridges).toMatch(/KITS_OPEN_GUIDE_KEY/)
    expect(bridges).toMatch(/consumeGuideBridge/)

    expect(read('components/admin/applications/ApplicationWorkSurface.tsx')).toMatch(
      /PRODUCTS_OPEN_GUIDE_KEY/,
    )
    expect(read('components/admin/products/ProductWorkSurface.tsx')).toMatch(
      /APPLICATIONS_OPEN_GUIDE_KEY/,
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

    expect(read('components/admin/applications/ApplicationWorkSurface.tsx')).toMatch(
      /pvcMatchingVersions|pvcEngineOptions/,
    )
    expect(read('components/admin/AdminProductApplicationsSection.tsx')).toMatch(
      /pvcMatchingVersions|PVC_CASCADE_HINT/,
    )
    expect(read('pages/admin/products/AdminApplicationsPage.tsx')).toMatch(/pvcEngineOptions/)
    expect(read('components/admin/AdminProductApplicationsSection.tsx')).toMatch(/Hub Aplicações/)
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
})
