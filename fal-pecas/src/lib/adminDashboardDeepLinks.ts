/**
 * Deep links canônicos + contextual do split do Painel.
 * Widgets devem usar estes helpers — não hardcodar paths divergentes.
 */

import type { AdminOrderGroupId } from '@/lib/adminOrderOps'
import { buildOrdersHubPath, type OrdersHubArea } from '@/lib/adminOrdersUrl'
import { getWidgetMeta } from '@/lib/adminDashboardWidgets'

export type AttentionActorFilter = 'team' | 'customer' | 'all'

export type ReportsFocus =
  | 'open'
  | 'delivered'
  | 'gmv'
  | 'series-gmv'
  | 'series-cash'

export type DashboardContextual =
  | { kind: 'order'; orderId: string }
  | { kind: 'hub-finance' }
  | { kind: 'hub-attention'; actor?: AttentionActorFilter }
  | {
      kind: 'hub-area'
      tab: 'pedidos' | 'comercial'
      area: Exclude<OrdersHubArea, null>
    }
  | { kind: 'hub-logistics'; fila: string }
  | { kind: 'hub-pipeline'; grupo: AdminOrderGroupId }
  | { kind: 'reports-summary'; focus?: ReportsFocus }
  | null

export type WidgetDeepLinkCtx = {
  orderId?: string
  logisticsFila?: string
  pipelineGrupo?: AdminOrderGroupId
  actor?: AttentionActorFilter
  reportsFocus?: ReportsFocus
}

/** Deep link “Abrir tela completa” por widget (e contexto opcional). */
export function resolveWidgetDeepLink(
  widgetId: string,
  ctx: WidgetDeepLinkCtx = {},
): string {
  switch (widgetId) {
    case 'cash-box':
    case 'chart-cash-series':
      return buildOrdersHubPath({ tab: 'financeiro' })
    case 'logistics-queues':
      return buildOrdersHubPath({
        tab: 'logistica',
        fila: ctx.logisticsFila ?? 'volumes',
      })
    case 'pipeline-flow':
      return ctx.pipelineGrupo
        ? `/admin/pedidos/lista?grupo=${ctx.pipelineGrupo}`
        : '/admin/pedidos/lista'
    case 'kpi-awaiting-pay':
      return buildOrdersHubPath({
        tab: 'comercial',
        area: 'aguardando-pagamento',
      })
    case 'kpi-team-action':
      return buildOrdersHubPath({ tab: 'visao-geral' })
    case 'kpi-customer-action':
      return buildOrdersHubPath({ tab: 'visao-geral' })
    case 'attention-table':
      if (ctx.orderId) return `/admin/pedidos/${ctx.orderId}`
      return buildOrdersHubPath({ tab: 'visao-geral' })
    case 'kpi-reports-open':
    case 'kpi-reports-delivered':
    case 'gmv-delivered':
    case 'chart-gmv-series':
    case 'chart-performance':
      return '/admin/relatorios'
    case 'exec-summary':
    case 'quick-controls':
      return buildOrdersHubPath({ tab: 'visao-geral' })
    default: {
      const meta = getWidgetMeta(widgetId)
      return meta?.deepLink ?? '/admin'
    }
  }
}

/** Contextual do split ao clicar no widget. */
export function resolveWidgetContextual(
  widgetId: string,
  ctx: WidgetDeepLinkCtx = {},
): DashboardContextual {
  switch (widgetId) {
    case 'cash-box':
    case 'chart-cash-series':
      return { kind: 'hub-finance' }
    case 'logistics-queues':
      return {
        kind: 'hub-logistics',
        fila: ctx.logisticsFila ?? 'volumes',
      }
    case 'pipeline-flow':
      return {
        kind: 'hub-pipeline',
        grupo: ctx.pipelineGrupo ?? 'pagamento',
      }
    case 'kpi-awaiting-pay':
      return {
        kind: 'hub-area',
        tab: 'comercial',
        area: 'aguardando-pagamento',
      }
    case 'kpi-team-action':
      return { kind: 'hub-attention', actor: ctx.actor ?? 'team' }
    case 'kpi-customer-action':
      return { kind: 'hub-attention', actor: ctx.actor ?? 'customer' }
    case 'attention-table':
      if (ctx.orderId) return { kind: 'order', orderId: ctx.orderId }
      return { kind: 'hub-attention', actor: ctx.actor ?? 'all' }
    case 'kpi-reports-open':
      return { kind: 'reports-summary', focus: 'open' }
    case 'kpi-reports-delivered':
      return { kind: 'reports-summary', focus: 'delivered' }
    case 'gmv-delivered':
      return { kind: 'reports-summary', focus: 'gmv' }
    case 'chart-gmv-series':
      return { kind: 'reports-summary', focus: 'series-gmv' }
    case 'chart-performance':
      return { kind: 'reports-summary', focus: 'series-gmv' }
    case 'exec-summary':
      return { kind: 'hub-attention', actor: 'all' }
    case 'quick-controls':
      return { kind: 'hub-attention', actor: 'all' }
    default:
      return null
  }
}

/** Controles rápidos → contextual + deep link. */
export function resolveQuickControl(
  id:
    | 'analise'
    | 'separacao'
    | 'expedicao'
    | 'atencao-equipe'
    | 'aguardando-pag'
    | 'relatorios',
): { contextual: DashboardContextual; deepLink: string } {
  switch (id) {
    case 'analise':
      return {
        contextual: { kind: 'hub-area', tab: 'comercial', area: 'analise' },
        deepLink: buildOrdersHubPath({ tab: 'comercial', area: 'analise' }),
      }
    case 'separacao':
      return {
        contextual: { kind: 'hub-area', tab: 'pedidos', area: 'separacao' },
        deepLink: buildOrdersHubPath({ tab: 'pedidos', area: 'separacao' }),
      }
    case 'expedicao':
      return {
        contextual: { kind: 'hub-logistics', fila: 'volumes' },
        deepLink: buildOrdersHubPath({ tab: 'logistica', fila: 'volumes' }),
      }
    case 'atencao-equipe':
      return {
        contextual: { kind: 'hub-attention', actor: 'team' },
        deepLink: buildOrdersHubPath({ tab: 'visao-geral' }),
      }
    case 'aguardando-pag':
      return {
        contextual: {
          kind: 'hub-area',
          tab: 'comercial',
          area: 'aguardando-pagamento',
        },
        deepLink: buildOrdersHubPath({
          tab: 'comercial',
          area: 'aguardando-pagamento',
        }),
      }
    case 'relatorios':
      return {
        contextual: { kind: 'reports-summary' },
        deepLink: '/admin/relatorios',
      }
  }
}

export function deepLinkForContextual(ctx: NonNullable<DashboardContextual>): string {
  switch (ctx.kind) {
    case 'order':
      return `/admin/pedidos/${ctx.orderId}`
    case 'hub-finance':
      return buildOrdersHubPath({ tab: 'financeiro' })
    case 'hub-attention':
      return buildOrdersHubPath({ tab: 'visao-geral' })
    case 'hub-area':
      return buildOrdersHubPath({ tab: ctx.tab, area: ctx.area })
    case 'hub-logistics':
      return buildOrdersHubPath({ tab: 'logistica', fila: ctx.fila })
    case 'hub-pipeline':
      return `/admin/pedidos/lista?grupo=${ctx.grupo}`
    case 'reports-summary':
      return '/admin/relatorios'
  }
}

export function contextualTitle(ctx: NonNullable<DashboardContextual>): string {
  switch (ctx.kind) {
    case 'order':
      return `Pedido ${ctx.orderId.slice(0, 8)}…`
    case 'hub-finance':
      return 'Financeiro'
    case 'hub-attention':
      if (ctx.actor === 'team') return 'Atenção — equipe'
      if (ctx.actor === 'customer') return 'Atenção — cliente'
      return 'Atenção'
    case 'hub-area':
      if (ctx.area === 'analise') return 'Análise'
      if (ctx.area === 'separacao') return 'Separação'
      if (ctx.area === 'aguardando-pagamento') return 'Aguardando pagamento'
      return 'Pedidos'
    case 'hub-logistics':
      return `Logística · ${ctx.fila}`
    case 'hub-pipeline':
      return `Fluxo · ${ctx.grupo}`
    case 'reports-summary':
      return 'Relatórios'
  }
}
