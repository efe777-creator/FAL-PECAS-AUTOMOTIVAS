import { OrderPreviewPanel } from '@/components/admin/orders/OrderPreviewPanel'
import { OrdersAttentionListPanel } from '@/components/admin/orders/OrdersAttentionListPanel'
import { OrdersFinanceIndicatorsPanel } from '@/components/admin/orders/OrdersFinanceIndicatorsPanel'
import { OrdersLogisticsQueuesBar } from '@/components/admin/orders/OrdersLogisticsQueuesBar'
import { ReportsSummaryPanel } from '@/components/admin/reports/ReportsSummaryPanel'
import { ErrorState } from '@/components/common/ErrorState'
import { Loading } from '@/components/common/Loading'
import { useDashboardData } from '@/components/admin/dashboard/DashboardDataProvider'
import {
  AdminOrdersListPanel,
  filterOrdersBySearch,
} from '@/pages/admin/orders/AdminOrdersListPanel'
import {
  contextualTitle,
  deepLinkForContextual,
  type DashboardContextual,
} from '@/lib/adminDashboardDeepLinks'
import {
  ADMIN_ORDER_GROUPS,
  ATTENTION_STATUSES,
  getAdminOrderArea,
} from '@/lib/adminOrderOps'
import { rememberOrdersReturnPath } from '@/lib/adminOrdersNav'
import { toUserMessage } from '@/lib/toUserMessage'
import {
  ADMIN_LIST_PAGE_SIZE,
  adminCentralIndicators,
  adminListLogisticsQueue,
  adminListOrders,
  adminLogisticsQueueCounts,
  type AdminCentralIndicators,
  type AdminOrderListRow,
} from '@/services/admin/adminOrderService'
import { adminReportsBundle } from '@/services/admin/adminReportsService'
import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'

type Props = {
  contextual: NonNullable<DashboardContextual>
  onClose: () => void
  onOpenOrder: (orderId: string) => void
  onOpenFullOrder: (orderId: string) => void
  /** Troca fila no contextual logística. */
  onChangeLogisticsFila?: (fila: string) => void
}

export function DashboardContextualPanel({
  contextual,
  onClose,
  onOpenOrder,
  onOpenFullOrder,
  onChangeLogisticsFila,
}: Props) {
  const navigate = useNavigate()
  const deepLink = deepLinkForContextual(contextual)

  function openFullScreen() {
    if (contextual.kind === 'order' || deepLink.startsWith('/admin/pedidos')) {
      rememberOrdersReturnPath('/admin')
    }
    navigate(deepLink)
  }

  return (
    <div className="flex h-full min-h-0 flex-col gap-3">
      <div className="min-h-0 flex-1 overflow-auto">
        {contextual.kind === 'order' ? (
          <OrderPreviewPanel
            orderId={contextual.orderId}
            onClose={onClose}
            onOpenFull={() => onOpenFullOrder(contextual.orderId)}
          />
        ) : null}
        {contextual.kind === 'hub-finance' ? <FinanceBody /> : null}
        {contextual.kind === 'hub-attention' ? (
          <AttentionBody
            actor={contextual.actor ?? 'all'}
            onSelectOrder={onOpenOrder}
          />
        ) : null}
        {contextual.kind === 'hub-area' ? (
          <AreaListBody
            tab={contextual.tab}
            area={contextual.area}
            onSelectOrder={onOpenOrder}
          />
        ) : null}
        {contextual.kind === 'hub-logistics' ? (
          <LogisticsBody
            fila={contextual.fila}
            onSelectOrder={onOpenOrder}
            onChangeFila={onChangeLogisticsFila}
          />
        ) : null}
        {contextual.kind === 'hub-pipeline' ? (
          <PipelineBody grupo={contextual.grupo} onSelectOrder={onOpenOrder} />
        ) : null}
        {contextual.kind === 'reports-summary' ? (
          <ReportsBody focus={contextual.focus} />
        ) : null}
      </div>
      {contextual.kind !== 'order' ? (
        <div className="shrink-0 border-t border-fal-line pt-3">
          <button
            type="button"
            className="text-sm font-semibold text-fal-accent underline-offset-2 hover:underline"
            onClick={openFullScreen}
          >
            Abrir tela completa →
          </button>
          <p className="mb-0 mt-1 text-xs text-fal-muted">
            {contextualTitle(contextual)}
          </p>
        </div>
      ) : null}
    </div>
  )
}

function FinanceBody() {
  const dash = useDashboardData()
  const cached = dash.centralIndicators.data
  const [ind, setInd] = useState<AdminCentralIndicators | null>(cached)
  const [loading, setLoading] = useState(!cached)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (cached) {
      setInd(cached)
      setLoading(false)
      return
    }
    let cancelled = false
    setLoading(true)
    void adminCentralIndicators()
      .then((v) => {
        if (!cancelled) setInd(v)
      })
      .catch((e) => {
        if (!cancelled) setError(toUserMessage(e, 'Erro ao carregar financeiro'))
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [cached])

  if (loading) return <Loading label="Carregando financeiro…" />
  if (error) return <ErrorState message={error} />
  if (!ind) return <p className="text-sm text-fal-muted">Sem indicadores.</p>
  return <OrdersFinanceIndicatorsPanel indicators={ind} showListaLink={false} />
}

function AttentionBody({
  actor,
  onSelectOrder,
}: {
  actor: 'team' | 'customer' | 'all'
  onSelectOrder: (id: string) => void
}) {
  const dash = useDashboardData()
  const cached = dash.attention.data
  const [rows, setRows] = useState<AdminOrderListRow[]>(cached ?? [])
  const [loading, setLoading] = useState(!cached)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (cached) {
      setRows(cached)
      setLoading(false)
      return
    }
    let cancelled = false
    setLoading(true)
    void adminListOrders(null, {
      statuses: [...ATTENTION_STATUSES],
      limit: ADMIN_LIST_PAGE_SIZE,
    })
      .then((list) => {
        if (!cancelled) setRows(list)
      })
      .catch((e) => {
        if (!cancelled) setError(toUserMessage(e, 'Erro ao carregar atenção'))
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [cached])

  if (loading) return <Loading label="Carregando atenção…" />
  if (error) return <ErrorState message={error} />
  return (
    <OrdersAttentionListPanel
      rows={rows}
      actor={actor}
      limit={20}
      onSelectOrder={onSelectOrder}
      title={
        actor === 'team'
          ? 'Atenção — equipe'
          : actor === 'customer'
            ? 'Atenção — cliente'
            : 'Exigem atenção'
      }
    />
  )
}

function AreaListBody({
  tab,
  area,
  onSelectOrder,
}: {
  tab: 'pedidos' | 'comercial'
  area: 'aguardando-pagamento' | 'analise' | 'separacao'
  onSelectOrder: (id: string) => void
}) {
  const [rows, setRows] = useState<AdminOrderListRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    const areaDef = getAdminOrderArea(area)
    void adminListOrders(null, {
      statuses: areaDef ? [...areaDef.statuses] : ['aguardando_pagamento'],
      limit: ADMIN_LIST_PAGE_SIZE,
    })
      .then((list) => {
        if (!cancelled) setRows(list)
      })
      .catch((e) => {
        if (!cancelled) setError(toUserMessage(e, 'Erro ao carregar pedidos'))
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [tab, area])

  const filtered = useMemo(() => filterOrdersBySearch(rows, search), [rows, search])

  return (
    <AdminOrdersListPanel
      rows={filtered}
      loading={loading}
      error={error}
      search={search}
      onSearch={setSearch}
      selectedOrderId={selectedOrderId}
      onSelectOrder={(id) => {
        setSelectedOrderId(id)
        onSelectOrder(id)
      }}
      showWaitingTime={area === 'aguardando-pagamento'}
    />
  )
}

function LogisticsBody({
  fila,
  onSelectOrder,
  onChangeFila,
}: {
  fila: string
  onSelectOrder: (id: string) => void
  onChangeFila?: (fila: string) => void
}) {
  const expedicaoFilas = [
    'volumes',
    'etiquetas-me',
    'entregas-proprias',
    'transito',
    'entregues',
  ] as const
  const activeFila = (expedicaoFilas as readonly string[]).includes(fila)
    ? (fila as (typeof expedicaoFilas)[number])
    : 'volumes'

  const dash = useDashboardData()
  const [counts, setCounts] = useState(dash.logisticsQueues.data)
  const [rows, setRows] = useState<AdminOrderListRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null)

  useEffect(() => {
    if (dash.logisticsQueues.data) setCounts(dash.logisticsQueues.data)
    else {
      void adminLogisticsQueueCounts()
        .then(setCounts)
        .catch(() => undefined)
    }
  }, [dash.logisticsQueues.data])

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    void adminListLogisticsQueue(activeFila, { limit: ADMIN_LIST_PAGE_SIZE })
      .then((list) => {
        if (!cancelled) setRows(list)
      })
      .catch((e) => {
        if (!cancelled) setError(toUserMessage(e, 'Erro ao carregar fila'))
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [activeFila])

  const filtered = useMemo(() => filterOrdersBySearch(rows, search), [rows, search])

  return (
    <div className="space-y-3">
      <OrdersLogisticsQueuesBar
        activeFila={activeFila}
        counts={counts}
        onSelectFila={(f) => onChangeFila?.(f)}
      />
      <AdminOrdersListPanel
        rows={filtered}
        loading={loading}
        error={error}
        search={search}
        onSearch={setSearch}
        selectedOrderId={selectedOrderId}
        onSelectOrder={(id) => {
          setSelectedOrderId(id)
          onSelectOrder(id)
        }}
      />
    </div>
  )
}

function PipelineBody({
  grupo,
  onSelectOrder,
}: {
  grupo: string
  onSelectOrder: (id: string) => void
}) {
  const group = ADMIN_ORDER_GROUPS.find((g) => g.id === grupo)
  const [rows, setRows] = useState<AdminOrderListRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    const statuses = group ? [...group.statuses] : undefined
    void adminListOrders(null, {
      statuses,
      limit: ADMIN_LIST_PAGE_SIZE,
    })
      .then((list) => {
        if (!cancelled) setRows(list)
      })
      .catch((e) => {
        if (!cancelled) setError(toUserMessage(e, 'Erro ao carregar fluxo'))
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [grupo, group])

  const filtered = useMemo(() => filterOrdersBySearch(rows, search), [rows, search])

  return (
    <AdminOrdersListPanel
      rows={filtered}
      loading={loading}
      error={error}
      search={search}
      onSearch={setSearch}
      selectedOrderId={selectedOrderId}
      onSelectOrder={(id) => {
        setSelectedOrderId(id)
        onSelectOrder(id)
      }}
      emptyTitle={group ? `Sem pedidos em ${group.title}` : 'Sem pedidos'}
    />
  )
}

function ReportsBody({
  focus,
}: {
  focus?: 'open' | 'delivered' | 'gmv' | 'series-gmv' | 'series-cash'
}) {
  const dash = useDashboardData()
  const cachedTotals = dash.basicTotals.data
  const [totals, setTotals] = useState(
    cachedTotals
      ? {
          ordersTotal: cachedTotals.ordersTotal,
          ordersOpen: cachedTotals.ordersOpen,
          ordersDelivered: cachedTotals.ordersDelivered,
          ordersCancelled: cachedTotals.ordersCancelled,
          revenueDelivered: cachedTotals.revenueDelivered,
        }
      : null,
  )
  const [counts, setCounts] = useState<Record<string, number> | undefined>(
    dash.statusCounts.data ?? undefined,
  )
  const [loading, setLoading] = useState(!cachedTotals)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (cachedTotals) {
      setTotals({
        ordersTotal: cachedTotals.ordersTotal,
        ordersOpen: cachedTotals.ordersOpen,
        ordersDelivered: cachedTotals.ordersDelivered,
        ordersCancelled: cachedTotals.ordersCancelled,
        revenueDelivered: cachedTotals.revenueDelivered,
      })
      setLoading(false)
    }
    if (dash.statusCounts.data) setCounts(dash.statusCounts.data)

    if (cachedTotals && dash.statusCounts.data) return

    let cancelled = false
    setLoading(true)
    void adminReportsBundle()
      .then((bundle) => {
        if (cancelled) return
        setTotals(bundle.totals)
        setCounts(bundle.counts)
      })
      .catch((e) => {
        if (!cancelled) setError(toUserMessage(e, 'Erro ao carregar relatórios'))
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [cachedTotals, dash.statusCounts.data])

  if (loading) return <Loading label="Carregando relatórios…" />
  if (error) return <ErrorState message={error} />
  if (!totals) return <p className="text-sm text-fal-muted">Sem totais.</p>
  return (
    <ReportsSummaryPanel
      totals={totals}
      counts={counts}
      focus={focus}
      seriesHint={
        focus === 'series-gmv' || focus === 'series-cash'
          ? 'Veja também o gráfico no widget correspondente do Painel.'
          : null
      }
    />
  )
}
