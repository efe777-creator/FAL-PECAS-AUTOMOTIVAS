import { canAccessAdminPath } from '@/lib/adminNavAccess'
import type { WidgetSizeBounds } from '@/lib/adminDashboardLayout'

export type DashboardDataSourceId =
  | 'statusCounts'
  | 'attention'
  | 'centralIndicators'
  | 'logisticsQueues'
  | 'basicTotals'
  | 'dailySeries'

export type WidgetCategory =
  | 'comercial'
  | 'financeiro'
  | 'operacional'
  | 'sistema'

export type WidgetStatus = 'available' | 'beta' | 'retired'

/** Metadados do registry (sem componente — binding em widgets/index). */
export type WidgetMeta = {
  id: string
  title: string
  description: string
  category: WidgetCategory
  icon: string
  /** Paths usados com canAccessAdminPath — todos devem passar (AND). */
  requiredPaths: readonly string[]
  /** Se true, exige acesso a /admin/relatorios (F8 / MGMT). */
  requiresReports: boolean
  /** Se true, exige pagamentos OU relatórios (caixa). */
  requiresCash: boolean
  defaultSize: { w: number; h: number }
  minSize: { w: number; h: number }
  maxSize: { w: number; h: number }
  dataDependencies: readonly DashboardDataSourceId[]
  deepLink?: string
  status: WidgetStatus
  configurable: boolean
}

export const ADMIN_DASHBOARD_WIDGET_CATALOG: readonly WidgetMeta[] = [
  {
    id: 'exec-summary',
    title: 'Resumo executivo',
    description:
      'Faixa KPI — pedidos ativos, atenção, GMV e caixa (quando autorizado).',
    category: 'sistema',
    icon: 'summary',
    requiredPaths: ['/admin/pedidos'],
    requiresReports: false,
    requiresCash: false,
    defaultSize: { w: 12, h: 3 },
    minSize: { w: 6, h: 2 },
    maxSize: { w: 12, h: 4 },
    dataDependencies: [
      'statusCounts',
      'attention',
      'basicTotals',
      'centralIndicators',
    ],
    deepLink: '/admin/pedidos',
    status: 'available',
    configurable: false,
  },
  {
    id: 'quick-controls',
    title: 'Controles rápidos',
    description: 'Atalhos do funil operacional (deep-link).',
    category: 'sistema',
    icon: 'bolt',
    requiredPaths: ['/admin/pedidos'],
    requiresReports: false,
    requiresCash: false,
    defaultSize: { w: 12, h: 2 },
    minSize: { w: 6, h: 2 },
    maxSize: { w: 12, h: 3 },
    dataDependencies: ['attention'],
    deepLink: '/admin/pedidos',
    status: 'available',
    configurable: false,
  },
  {
    id: 'shortcuts-pinned',
    title: 'Atalhos pinados',
    description: 'Módulos favoritos neste dispositivo.',
    category: 'sistema',
    icon: 'pin',
    requiredPaths: ['/admin'],
    requiresReports: false,
    requiresCash: false,
    defaultSize: { w: 12, h: 3 },
    minSize: { w: 6, h: 2 },
    maxSize: { w: 12, h: 5 },
    dataDependencies: [],
    status: 'available',
    configurable: false,
  },
  {
    id: 'attention-table',
    title: 'Atenção',
    description: 'Pedidos que precisam de ação da equipe ou do cliente.',
    category: 'operacional',
    icon: 'list',
    requiredPaths: ['/admin/pedidos'],
    requiresReports: false,
    requiresCash: false,
    defaultSize: { w: 8, h: 5 },
    minSize: { w: 4, h: 3 },
    maxSize: { w: 12, h: 10 },
    dataDependencies: ['attention'],
    deepLink: '/admin/pedidos',
    status: 'available',
    configurable: false,
  },
  {
    id: 'pipeline-flow',
    title: 'Fluxo do pedido',
    description: 'Pipeline horizontal por grupo + exceções + detalhe.',
    category: 'operacional',
    icon: 'flow',
    requiredPaths: ['/admin/pedidos'],
    requiresReports: false,
    requiresCash: false,
    defaultSize: { w: 12, h: 6 },
    minSize: { w: 6, h: 4 },
    maxSize: { w: 12, h: 10 },
    dataDependencies: ['statusCounts', 'attention', 'logisticsQueues'],
    status: 'available',
    configurable: false,
  },
  {
    id: 'kpi-awaiting-pay',
    title: 'Aguardando pagamento',
    description: 'Contagem de pedidos aguardando pagamento.',
    category: 'operacional',
    icon: 'pay',
    requiredPaths: ['/admin/pedidos'],
    requiresReports: false,
    requiresCash: false,
    defaultSize: { w: 3, h: 2 },
    minSize: { w: 2, h: 2 },
    maxSize: { w: 6, h: 3 },
    dataDependencies: ['statusCounts'],
    deepLink: '/admin/pedidos?tab=comercial&area=aguardando-pagamento',
    status: 'available',
    configurable: false,
  },
  {
    id: 'kpi-team-action',
    title: 'Ação da equipe',
    description: 'Pendências com ação da loja.',
    category: 'operacional',
    icon: 'team',
    requiredPaths: ['/admin/pedidos'],
    requiresReports: false,
    requiresCash: false,
    defaultSize: { w: 3, h: 2 },
    minSize: { w: 2, h: 2 },
    maxSize: { w: 6, h: 3 },
    dataDependencies: ['attention'],
    deepLink: '/admin/pedidos',
    status: 'available',
    configurable: false,
  },
  {
    id: 'kpi-customer-action',
    title: 'Ação do cliente',
    description: 'Pendências aguardando o cliente.',
    category: 'operacional',
    icon: 'user',
    requiredPaths: ['/admin/pedidos'],
    requiresReports: false,
    requiresCash: false,
    defaultSize: { w: 3, h: 2 },
    minSize: { w: 2, h: 2 },
    maxSize: { w: 6, h: 3 },
    dataDependencies: ['attention'],
    deepLink: '/admin/pedidos',
    status: 'available',
    configurable: false,
  },
  {
    id: 'kpi-reports-open',
    title: 'Em aberto (F8)',
    description: 'Pedidos em aberto — Relatórios.',
    category: 'comercial',
    icon: 'open',
    requiredPaths: ['/admin/relatorios'],
    requiresReports: true,
    requiresCash: false,
    defaultSize: { w: 3, h: 2 },
    minSize: { w: 2, h: 2 },
    maxSize: { w: 6, h: 3 },
    dataDependencies: ['basicTotals'],
    deepLink: '/admin/relatorios',
    status: 'available',
    configurable: false,
  },
  {
    id: 'kpi-reports-delivered',
    title: 'Entregues (F8)',
    description: 'Pedidos entregues — Relatórios.',
    category: 'comercial',
    icon: 'check',
    requiredPaths: ['/admin/relatorios'],
    requiresReports: true,
    requiresCash: false,
    defaultSize: { w: 3, h: 2 },
    minSize: { w: 2, h: 2 },
    maxSize: { w: 6, h: 3 },
    dataDependencies: ['basicTotals'],
    deepLink: '/admin/relatorios',
    status: 'available',
    configurable: false,
  },
  {
    id: 'gmv-delivered',
    title: 'Receita entregue (GMV)',
    description: 'GMV de pedidos entregues — distinto do caixa payments.',
    category: 'comercial',
    icon: 'gmv',
    requiredPaths: ['/admin/relatorios'],
    requiresReports: true,
    requiresCash: false,
    defaultSize: { w: 3, h: 2 },
    minSize: { w: 2, h: 2 },
    maxSize: { w: 6, h: 3 },
    dataDependencies: ['basicTotals'],
    deepLink: '/admin/relatorios',
    status: 'available',
    configurable: false,
  },
  {
    id: 'cash-box',
    title: 'Caixa (payments)',
    description: 'Líquido / capturado / pendente — indicadores da Central.',
    category: 'financeiro',
    icon: 'cash',
    requiredPaths: [],
    requiresReports: false,
    requiresCash: true,
    defaultSize: { w: 6, h: 3 },
    minSize: { w: 4, h: 2 },
    maxSize: { w: 12, h: 5 },
    dataDependencies: ['centralIndicators'],
    deepLink: '/admin/pedidos?tab=financeiro',
    status: 'available',
    configurable: false,
  },
  {
    id: 'logistics-queues',
    title: 'Filas logística',
    description: 'Contagens das filas da Expedição (grid 2×2).',
    category: 'operacional',
    icon: 'truck',
    requiredPaths: ['/admin/pedidos'],
    requiresReports: false,
    requiresCash: false,
    defaultSize: { w: 4, h: 5 },
    minSize: { w: 3, h: 3 },
    maxSize: { w: 12, h: 8 },
    dataDependencies: ['logisticsQueues'],
    deepLink: '/admin/pedidos?tab=logistica',
    status: 'available',
    configurable: false,
  },
  {
    id: 'chart-performance',
    title: 'Desempenho',
    description: 'GMV entregue e caixa capturado no período (eixos distintos).',
    category: 'comercial',
    icon: 'chart',
    requiredPaths: [],
    requiresReports: false,
    requiresCash: true,
    defaultSize: { w: 12, h: 5 },
    minSize: { w: 6, h: 3 },
    maxSize: { w: 12, h: 8 },
    dataDependencies: ['dailySeries'],
    deepLink: '/admin/relatorios',
    status: 'available',
    configurable: false,
  },
  {
    id: 'chart-gmv-series',
    title: 'Série GMV entregue',
    description: 'Receita entregue por dia (≠ caixa). Requer F8.',
    category: 'comercial',
    icon: 'chart',
    requiredPaths: ['/admin/relatorios'],
    requiresReports: true,
    requiresCash: false,
    defaultSize: { w: 12, h: 4 },
    minSize: { w: 6, h: 3 },
    maxSize: { w: 12, h: 8 },
    dataDependencies: ['dailySeries'],
    deepLink: '/admin/relatorios',
    status: 'available',
    configurable: false,
  },
  {
    id: 'chart-cash-series',
    title: 'Série caixa (payments)',
    description: 'Capturado e líquido diário — distinto do GMV.',
    category: 'financeiro',
    icon: 'chart',
    requiredPaths: [],
    requiresReports: false,
    requiresCash: true,
    defaultSize: { w: 12, h: 4 },
    minSize: { w: 6, h: 3 },
    maxSize: { w: 12, h: 8 },
    dataDependencies: ['dailySeries'],
    deepLink: '/admin/pedidos?tab=financeiro',
    status: 'available',
    configurable: false,
  },
] as const

/**
 * Layout padrão visual (mock FAL): KPIs → fluxo → atenção+logística → desempenho.
 * Widgets antigos (kpi-*, charts soltos) permanecem no catálogo para + Widget.
 */
export const DEFAULT_LAYOUT_WIDGET_ORDER: readonly string[] = [
  'exec-summary',
  'pipeline-flow',
  'attention-table',
  'logistics-queues',
  'chart-performance',
]

/** Posições default 12-col (1ª visita / Reset). Layout salvo não é sobrescrito. */
export const DEFAULT_LAYOUT_PLACEMENTS: Readonly<
  Record<string, { x: number; y: number; w: number; h: number }>
> = {
  'exec-summary': { x: 0, y: 0, w: 12, h: 3 },
  'pipeline-flow': { x: 0, y: 3, w: 12, h: 6 },
  'attention-table': { x: 0, y: 9, w: 8, h: 5 },
  'logistics-queues': { x: 8, y: 9, w: 4, h: 5 },
  'chart-performance': { x: 0, y: 14, w: 12, h: 5 },
}

export function getWidgetMeta(id: string): WidgetMeta | undefined {
  return ADMIN_DASHBOARD_WIDGET_CATALOG.find((w) => w.id === id)
}

export function widgetAllowedForRole(
  meta: WidgetMeta,
  role: string | null | undefined,
): boolean {
  if (meta.status === 'retired') return false
  if (!role || role === 'customer') return false
  for (const path of meta.requiredPaths) {
    if (!canAccessAdminPath(path, role)) return false
  }
  if (meta.requiresReports && !canAccessAdminPath('/admin/relatorios', role)) {
    return false
  }
  if (meta.requiresCash) {
    const cash =
      canAccessAdminPath('/admin/pagamentos', role) ||
      canAccessAdminPath('/admin/relatorios', role)
    if (!cash) return false
  }
  return true
}

export function listAvailableWidgets(
  role: string | null | undefined,
): WidgetMeta[] {
  return ADMIN_DASHBOARD_WIDGET_CATALOG.filter(
    (w) => w.status !== 'retired' && widgetAllowedForRole(w, role),
  )
}

export function allowedWidgetIdSet(
  role: string | null | undefined,
): Set<string> {
  return new Set(listAvailableWidgets(role).map((w) => w.id))
}

export function boundsMapForRole(
  role: string | null | undefined,
): Map<string, WidgetSizeBounds> {
  const m = new Map<string, WidgetSizeBounds>()
  for (const w of listAvailableWidgets(role)) {
    m.set(w.id, {
      defaultSize: w.defaultSize,
      minSize: w.minSize,
      maxSize: w.maxSize,
    })
  }
  return m
}

export function defaultWidgetIdsForRole(
  role: string | null | undefined,
): string[] {
  const allowed = allowedWidgetIdSet(role)
  return DEFAULT_LAYOUT_WIDGET_ORDER.filter((id) => allowed.has(id))
}
