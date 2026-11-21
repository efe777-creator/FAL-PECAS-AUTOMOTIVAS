import { CustomerCadastroPreviewModal } from '@/components/admin/customers/CustomerCadastroPreviewModal'
import { OrderOpsSurface } from '@/components/admin/orders/OrderOpsSurface'
import type { AdaptiveWorkspaceModeApi } from '@/components/admin/workspace/AdaptiveWorkspace'
import { OrdersFinanceIndicatorsPanel } from '@/components/admin/orders/OrdersFinanceIndicatorsPanel'
import { OrdersHubAreaCards } from '@/components/admin/orders/OrdersHubAreaCards'
import { OrdersHubFinanceStrip } from '@/components/admin/orders/OrdersHubFinanceStrip'
import { OrdersHubKpiRow } from '@/components/admin/orders/OrdersHubKpiRow'
import { OrdersLogisticsQueuesBar } from '@/components/admin/orders/OrdersLogisticsQueuesBar'
import { OrderRowActionsMenu } from '@/components/admin/orders/OrderRowActionsMenu'
import { OrderSplitTabPanels } from '@/components/admin/orders/OrderSplitTabPanels'
import {
  badgeClass,
  toneForOrderStatus,
} from '@/components/admin/orders/orderStatusTone'
import { AdaptiveWorkspace } from '@/components/admin/workspace/AdaptiveWorkspace'
import { Button } from '@/components/common/Button'
import { ErrorState } from '@/components/common/ErrorState'
import { Input } from '@/components/common/Input'
import { Loading } from '@/components/common/Loading'
import { useToast } from '@/components/common/Toast'
import { type AdminLogisticsQueueId } from '@/lib/adminLogisticsQueues'
import {
  ADMIN_ORDER_AREAS,
  ADMIN_ORDER_VIEWS,
  adminOrderAreaId,
  getAdminOrderArea,
  sumAreaCount,
} from '@/lib/adminOrderOps'
import {
  filterOrdersBySearch,
  AdminOrdersListPanel,
  listStatusLabel,
} from './AdminOrdersListPanel'
import {
  confirmExpireUnpaidIntent,
  formatExpireUnpaidMessage,
  runExpireUnpaidOrders,
} from '@/lib/adminExpireUnpaidFlow'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { toUserMessage } from '@/lib/toUserMessage'
import { rememberOrdersReturnPath } from '@/lib/adminOrdersNav'
import {
  buildOrdersHubPath,
  parseOrdersHubSearch,
  type OrdersHubArea,
  type OrdersHubTab,
} from '@/lib/adminOrdersUrl'
import {
  REVISAO_CHIPS,
  revisaoStageLabel,
  rowMatchesRevisaoChip,
  type RevisaoChipId,
} from '@/lib/postSaleRevisaoChips'
import { POST_SALE_STAGE_LABEL, asPostSaleStage } from '@/lib/postSaleStages'
import { pickPrimaryPostSaleOccurrence } from '@/lib/postSaleReturnOpsSummary'
import { deriveOccurrences } from '@/lib/orderOccurrences'
import {
  ADMIN_LIST_PAGE_SIZE,
  adminCentralIndicators,
  adminListLogisticsQueue,
  adminListOrders,
  adminLogisticsQueueCounts,
  adminOrderStatusCounts,
  type AdminCentralIndicators,
  type AdminOrderDetail,
  type AdminOrderListRow,
} from '@/services/admin/adminOrderService'
import type { LogisticsQueueCounts } from '@/lib/adminLogisticsQueues'
import { useOrderSplitTabs } from '@/hooks/useOrderSplitTabs'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'

const TABS: { id: OrdersHubTab; label: string }[] = [
  { id: 'visao-geral', label: 'Visão geral' },
  { id: 'pedidos', label: 'Pedidos' },
  { id: 'comercial', label: 'Comercial' },
  { id: 'logistica', label: 'Logística' },
  { id: 'financeiro', label: 'Financeiro' },
]

const EXPEDICAO_FILAS: AdminLogisticsQueueId[] = [
  'volumes',
  'etiquetas-me',
  'entregas-proprias',
  'revisao',
  'transito',
  'entregues',
]

type OverviewChip =
  | 'todos'
  | 'aguardando'
  | 'analise'
  | 'separacao'
  | 'expedicao'
  | 'cancelados'

const OVERVIEW_CHIPS: { id: OverviewChip; label: string }[] = [
  { id: 'todos', label: 'Todos' },
  { id: 'aguardando', label: 'Aguardando' },
  { id: 'analise', label: 'Em análise' },
  { id: 'separacao', label: 'Separação' },
  { id: 'expedicao', label: 'Expedição' },
  { id: 'cancelados', label: 'Cancelados' },
]

const KPI_TO_CHIP: Record<string, OverviewChip> = {
  pedidos: 'todos',
  pendencias: 'analise',
  expedicao: 'expedicao',
  cancelados: 'cancelados',
}

function parseFila(raw: string | null): AdminLogisticsQueueId {
  if (raw && EXPEDICAO_FILAS.includes(raw as AdminLogisticsQueueId)) {
    return raw as AdminLogisticsQueueId
  }
  return 'volumes'
}

function matchesOverviewChip(row: AdminOrderListRow, chip: OverviewChip): boolean {
  if (chip === 'todos') return true
  if (chip === 'cancelados') return row.status === 'cancelado' || row.status === 'expirado'
  const area = adminOrderAreaId(row.status)
  if (chip === 'aguardando') return area === 'aguardando-pagamento'
  if (chip === 'analise') return area === 'analise'
  if (chip === 'separacao') return area === 'separacao'
  if (chip === 'expedicao') return area === 'expedicao'
  return true
}

export function AdminOrdersHubPage() {
  useDocumentTitle('Pedidos | Admin FAL')
  const toast = useToast()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const hub = parseOrdersHubSearch(searchParams.toString())

  const [tableRows, setTableRows] = useState<AdminOrderListRow[]>([])
  const [counts, setCounts] = useState<Record<string, number>>({})
  const [logisticsCounts, setLogisticsCounts] = useState<LogisticsQueueCounts | null>(null)
  const [indicators, setIndicators] = useState<AdminCentralIndicators | null>(null)
  const [loading, setLoading] = useState(true)
  const [tableLoading, setTableLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [tableError, setTableError] = useState<string | null>(null)
  const [busyExpire, setBusyExpire] = useState(false)
  const [search, setSearch] = useState('')
  const {
    openOrderIds,
    activeOrderId: selectedOrderId,
    openOrder: openOrderInSplit,
    closeOrder: closeOrderTab,
    closeAll: closeAllOrderTabs,
    hasOpen: hasOpenOrderTabs,
  } = useOrderSplitTabs()
  const [overviewChip, setOverviewChip] = useState<OverviewChip>('todos')
  const [revisaoChip, setRevisaoChip] = useState<RevisaoChipId>('todas')
  const [guideStageByOrder, setGuideStageByOrder] = useState<Record<string, string | null>>(
    {},
  )
  const [customerModalOpen, setCustomerModalOpen] = useState(false)
  const workspaceModeApiRef = useRef<AdaptiveWorkspaceModeApi | null>(null)
  const [tableEpoch, setTableEpoch] = useState(0)

  const logisticsFila = parseFila(hub.fila)
  const isRevisaoFila = hub.tab === 'logistica' && logisticsFila === 'revisao'

  const setHubParams = useCallback(
    (next: { tab?: OrdersHubTab; area?: OrdersHubArea; fila?: string | null }) => {
      const path = buildOrdersHubPath({
        tab: next.tab ?? hub.tab,
        area: next.area !== undefined ? next.area : hub.area,
        fila: next.fila !== undefined ? next.fila : hub.fila,
      })
      const qs = path.includes('?') ? path.slice(path.indexOf('?') + 1) : ''
      setSearchParams(qs ? new URLSearchParams(qs) : new URLSearchParams(), { replace: true })
    },
    [hub.area, hub.fila, hub.tab, setSearchParams],
  )

  // Reescreve query suja (ex.: ?tab=pedidos&area=analise) para a forma canônica.
  useEffect(() => {
    const canonical = buildOrdersHubPath({
      tab: hub.tab,
      area: hub.area,
      fila: hub.fila,
    })
    const nextQs = canonical.includes('?') ? canonical.slice(canonical.indexOf('?') + 1) : ''
    if (nextQs !== searchParams.toString()) {
      setSearchParams(nextQs ? new URLSearchParams(nextQs) : new URLSearchParams(), {
        replace: true,
      })
    }
  }, [hub.tab, hub.area, hub.fila, searchParams, setSearchParams])

  async function reloadHub() {
    setLoading(true)
    setError(null)
    try {
      const [c, ind, lq] = await Promise.all([
        adminOrderStatusCounts(),
        adminCentralIndicators().catch(() => null),
        adminLogisticsQueueCounts().catch(() => null),
      ])
      setCounts(c)
      setIndicators(ind)
      setLogisticsCounts(lq)
    } catch (e) {
      setError(toUserMessage(e, 'Erro ao carregar pedidos'))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void reloadHub()
  }, [])

  useEffect(() => {
    if (hub.tab === 'financeiro') {
      setTableRows([])
      setTableError(null)
      return
    }

    let cancelled = false
    setTableLoading(true)
    setTableError(null)

    async function loadTable() {
      try {
        let rows: AdminOrderListRow[] = []
        if (hub.tab === 'visao-geral') {
          rows = await adminListOrders(null, { limit: ADMIN_LIST_PAGE_SIZE })
        } else if (hub.tab === 'logistica') {
          const fila = parseFila(hub.fila)
          rows = await adminListLogisticsQueue(fila, { limit: ADMIN_LIST_PAGE_SIZE })
        } else if (hub.tab === 'comercial') {
          const areaId = hub.area === 'analise' ? 'analise' : 'aguardando-pagamento'
          const area = getAdminOrderArea(areaId)
          rows = await adminListOrders(null, {
            statuses: area ? [...area.statuses] : ['aguardando_pagamento'],
            limit: ADMIN_LIST_PAGE_SIZE,
          })
        } else if (hub.tab === 'pedidos') {
          if (hub.area === 'separacao') {
            const area = getAdminOrderArea('separacao')
            rows = await adminListOrders(null, {
              statuses: area ? [...area.statuses] : ['confirmado', 'em_separacao'],
              limit: ADMIN_LIST_PAGE_SIZE,
            })
          } else {
            rows = await adminListOrders(null, { limit: ADMIN_LIST_PAGE_SIZE })
          }
        }
        if (!cancelled) setTableRows(rows)
      } catch (e) {
        if (!cancelled) setTableError(toUserMessage(e, 'Erro ao carregar lista'))
      } finally {
        if (!cancelled) setTableLoading(false)
      }
    }

    void loadTable()
    return () => {
      cancelled = true
    }
  }, [hub.tab, hub.area, hub.fila, tableEpoch])

  const filteredTable = useMemo(() => {
    let base =
      hub.tab === 'visao-geral'
        ? tableRows.filter((r) => matchesOverviewChip(r, overviewChip))
        : tableRows
    if (isRevisaoFila) {
      base = base.filter((r) => rowMatchesRevisaoChip(revisaoChip, r.revisaoMeta ?? null))
    }
    return filterOrdersBySearch(base, search)
  }, [tableRows, search, hub.tab, overviewChip, isRevisaoFila, revisaoChip])

  const selectedRow = useMemo(
    () => tableRows.find((r) => r.id === selectedOrderId) ?? null,
    [tableRows, selectedOrderId],
  )

  const selectedStageLabel = useMemo(() => {
    if (!selectedOrderId) return null
    const fromGuide = guideStageByOrder[selectedOrderId]
    if (fromGuide) return fromGuide
    const st = selectedRow?.revisaoMeta?.stage
    if (st) return revisaoStageLabel(st)
    return null
  }, [selectedOrderId, guideStageByOrder, selectedRow])

  function rememberGuideStage(orderId: string, order: AdminOrderDetail | null) {
    if (!order) {
      setGuideStageByOrder((prev) => {
        if (!(orderId in prev)) return prev
        const next = { ...prev }
        delete next[orderId]
        return next
      })
      return
    }
    const list = deriveOccurrences(
      (order.events ?? []).map((e) => ({
        id: e.id,
        eventType: e.eventType,
        payload: e.payload,
        visibility: e.visibility,
        createdAt: e.createdAt,
      })),
    )
    const primary = pickPrimaryPostSaleOccurrence(list)
    const stage =
      primary && primary.status !== 'resolved'
        ? asPostSaleStage(primary.stage) ?? primary.stage
        : null
    const label = stage
      ? POST_SALE_STAGE_LABEL[stage as keyof typeof POST_SALE_STAGE_LABEL] ?? String(stage)
      : null
    setGuideStageByOrder((prev) => {
      if (prev[orderId] === label) return prev
      return { ...prev, [orderId]: label }
    })
  }

  const kpiItems = useMemo(() => {
    const created =
      indicators?.operational.ordersCreated ?? Object.values(counts).reduce((a, b) => a + b, 0)
    const pendencias =
      (indicators?.operational.awaitingDecision ?? 0) +
      (indicators?.operational.cancellationPending ?? 0)
    const expedicao =
      (logisticsCounts?.volumes ?? 0) +
      (logisticsCounts?.['etiquetas-me'] ?? 0) +
      (logisticsCounts?.['entregas-proprias'] ?? 0) +
      (counts.pronto_para_envio ?? 0) +
      (counts.preparando_envio ?? 0) +
      (counts.enviado ?? 0)
    const cancelados = indicators?.operational.cancelled ?? counts.cancelado ?? 0
    return [
      { id: 'pedidos', label: 'Pedidos', value: created, tone: 'info' as const },
      { id: 'pendencias', label: 'Pendências', value: pendencias, tone: 'warning' as const },
      { id: 'expedicao', label: 'Expedição', value: expedicao, tone: 'success' as const },
      { id: 'cancelados', label: 'Cancelados', value: cancelados, tone: 'danger' as const },
    ]
  }, [indicators, counts, logisticsCounts])

  const areaCards = useMemo(() => {
    return ADMIN_ORDER_AREAS.map((area) => {
      const n = sumAreaCount(counts, area)
      if (area.id === 'aguardando-pagamento') {
        return {
          id: area.id,
          title: area.title,
          description: area.description,
          count: n,
          tone: 'warning' as const,
          hub: {
            tab: 'comercial' as const,
            area: 'aguardando-pagamento' as const,
            fila: null,
          },
        }
      }
      if (area.id === 'analise') {
        return {
          id: area.id,
          title: area.title,
          description: area.description,
          count: n,
          tone: 'info' as const,
          hub: { tab: 'comercial' as const, area: 'analise' as const, fila: null },
        }
      }
      if (area.id === 'separacao') {
        return {
          id: area.id,
          title: area.title,
          description: area.description,
          count: n,
          tone: 'navy' as const,
          hub: { tab: 'pedidos' as const, area: 'separacao' as const, fila: null },
        }
      }
      return {
        id: area.id,
        title: area.title,
        description: area.description,
        count: n,
        tone: 'success' as const,
        hub: { tab: 'logistica' as const, area: null, fila: 'volumes' },
      }
    })
  }, [counts])

  async function runExpireUnpaid() {
    if (!(await confirmExpireUnpaidIntent())) return
    setBusyExpire(true)
    try {
      const r = await runExpireUnpaidOrders()
      toast.push(formatExpireUnpaidMessage(r), 'success')
      await reloadHub()
    } catch (e) {
      toast.push(toUserMessage(e, 'Falha ao expirar pedidos'), 'error')
    } finally {
      setBusyExpire(false)
    }
  }

  function openFull(id: string) {
    rememberOrdersReturnPath(`${window.location.pathname}${window.location.search}`)
    navigate(`/admin/pedidos/${id}`)
  }

  const tabsNav = (
    <nav
      className="flex flex-wrap gap-1 rounded-[12px] border border-fal-line bg-fal-surface p-1 shadow-sm"
      aria-label="Navegação da Central"
    >
      {TABS.map((t) => {
        const active = hub.tab === t.id
        return (
          <button
            key={t.id}
            type="button"
            aria-pressed={active}
            className={[
              'min-h-11 rounded-[10px] px-3 text-sm font-bold transition',
              active ? 'bg-fal-navy text-white shadow-sm' : 'text-fal-fg hover:bg-fal-bg',
            ].join(' ')}
            onClick={() => {
              closeAllOrderTabs()
              setHubParams({
                tab: t.id,
                area:
                  t.id === 'comercial'
                    ? hub.area === 'analise' || hub.area === 'aguardando-pagamento'
                      ? hub.area
                      : 'aguardando-pagamento'
                    : t.id === 'pedidos'
                      ? hub.area === 'separacao'
                        ? 'separacao'
                        : null
                      : null,
                fila: t.id === 'logistica' ? hub.fila ?? 'volumes' : null,
              })
            }}
          >
            {t.label}
          </button>
        )
      })}
    </nav>
  )

  const ordersToolbar = (
    <div className="flex w-full flex-wrap items-end gap-2">
      <div className="min-w-[14rem] flex-1">
        <Input
          label="Buscar pedidos"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="nº, cliente, CPF, item, valor…"
        />
      </div>
      <Button
        type="button"
        variant="light"
        size="sm"
        onClick={() => setCustomerModalOpen(true)}
      >
        Clientes
      </Button>
      <Button
        type="button"
        variant="light"
        size="sm"
        disabled={busyExpire || loading}
        onClick={() => void runExpireUnpaid()}
      >
        {busyExpire ? 'Expirando…' : 'Retirar não pagos'}
      </Button>
      <Link
        to="/admin/pedidos/lista"
        className="inline-flex min-h-11 items-center rounded-[10px] border border-fal-line bg-fal-surface px-3 text-sm font-semibold text-fal-fg"
      >
        Lista avançada
      </Link>
    </div>
  )

  const primary = (
    <div className="admin-orders-hub space-y-5">
      <header className="min-w-0">
        <h1 className="text-2xl font-extrabold tracking-tight text-fal-fg">
          Central de Pedidos
        </h1>
        <p className="mt-1 max-w-2xl text-sm text-fal-muted">
          Gestão comercial, financeira e logística — preview na lateral, operação no detalhe.
        </p>
      </header>

      {loading ? <Loading label="Carregando central…" /> : null}
      {!loading && error ? <ErrorState message={error} /> : null}

      {/* Stack referência: KPIs → financeiro → abas → áreas → tabela */}
      {!loading && !error && hub.tab === 'visao-geral' ? (
        <>
          <OrdersHubKpiRow
            items={kpiItems}
            onSelect={(id) => {
              const chip = KPI_TO_CHIP[id]
              if (chip) setOverviewChip(chip)
            }}
          />
          {indicators ? (
            <OrdersHubFinanceStrip
              captured={indicators.financial.captured}
              refunded={indicators.financial.refunded}
              netReceived={indicators.financial.netReceived}
            />
          ) : null}
        </>
      ) : null}

      {!loading && !error ? tabsNav : null}

      {!loading && !error && hub.tab === 'visao-geral' ? (
        <>
          <OrdersHubAreaCards
            cards={areaCards}
            onNavigate={(next) => {
              closeAllOrderTabs()
              setHubParams(next)
            }}
          />

          <section className="space-y-3" aria-label="Pedidos">
            {ordersToolbar}
            <div className="flex flex-wrap gap-1.5" role="group" aria-label="Filtro rápido">
              {OVERVIEW_CHIPS.map((chip) => {
                const pressed = overviewChip === chip.id
                return (
                  <button
                    key={chip.id}
                    type="button"
                    aria-pressed={pressed}
                    className={[
                      'min-h-10 rounded-full border px-3 text-xs font-bold transition',
                      pressed
                        ? 'border-fal-navy bg-fal-navy text-white'
                        : 'border-fal-line bg-fal-surface text-fal-fg hover:bg-fal-bg',
                    ].join(' ')}
                    onClick={() => setOverviewChip(chip.id)}
                  >
                    {chip.label}
                  </button>
                )
              })}
            </div>
            <AdminOrdersListPanel
              rows={filteredTable}
              loading={tableLoading}
              error={tableError}
              search={search}
              onSearch={setSearch}
              selectedOrderId={selectedOrderId}
              openOrderIds={openOrderIds}
              onSelectOrder={openOrderInSplit}
              hideSearch
              emptyTitle="Nenhum pedido neste filtro"
              emptyDescription="Troque o chip ou abra uma área de trabalho."
            />
          </section>

          <p className="text-xs text-fal-muted">
            Atalhos:{' '}
            <Link to="/admin/avisos" className="font-semibold text-fal-accent">
              Notificações
            </Link>
            {ADMIN_ORDER_VIEWS.slice(0, 3).map((v) => (
              <span key={v.id}>
                {' · '}
                <Link to={v.path} className="font-semibold text-fal-accent">
                  {v.title}
                </Link>
              </span>
            ))}
          </p>
        </>
      ) : null}

      {!loading && !error && hub.tab === 'financeiro' ? (
        indicators ? (
          <OrdersFinanceIndicatorsPanel indicators={indicators} />
        ) : (
          <ErrorState message="Indicadores financeiros indisponíveis no momento." />
        )
      ) : null}

      {!loading && !error && (hub.tab === 'pedidos' || hub.tab === 'comercial') ? (
        <section className="space-y-3">
          {ordersToolbar}
          <div className="flex flex-wrap gap-2" role="group" aria-label="Filtro de área">
            {(hub.tab === 'comercial'
              ? ADMIN_ORDER_AREAS.filter(
                  (a) => a.id === 'aguardando-pagamento' || a.id === 'analise',
                )
              : ADMIN_ORDER_AREAS.filter((a) => a.id === 'separacao')
            ).map((area) => {
              const pressed =
                hub.tab === 'pedidos'
                  ? hub.area === 'separacao'
                  : (hub.area ?? 'aguardando-pagamento') === area.id
              const n = sumAreaCount(counts, area)
              return (
                <button
                  key={area.id}
                  type="button"
                  aria-pressed={pressed}
                  className={[
                    'min-h-11 rounded-[10px] border px-3 text-sm font-bold',
                    pressed
                      ? 'border-fal-navy bg-fal-navy text-white'
                      : 'border-fal-line bg-fal-surface text-fal-fg',
                  ].join(' ')}
                  onClick={() =>
                    setHubParams({
                      tab: hub.tab,
                      area: area.id as OrdersHubArea,
                      fila: null,
                    })
                  }
                >
                  {area.title} ({n})
                </button>
              )
            })}
            {hub.tab === 'pedidos' ? (
              <button
                type="button"
                aria-pressed={!hub.area}
                className={[
                  'min-h-11 rounded-[10px] border px-3 text-sm font-bold',
                  !hub.area
                    ? 'border-fal-navy bg-fal-navy text-white'
                    : 'border-fal-line bg-fal-surface text-fal-fg',
                ].join(' ')}
                onClick={() => setHubParams({ tab: 'pedidos', area: null, fila: null })}
              >
                Todos
              </button>
            ) : null}
          </div>
          <AdminOrdersListPanel
            rows={filteredTable}
            loading={tableLoading}
            error={tableError}
            search={search}
            onSearch={setSearch}
            selectedOrderId={selectedOrderId}
            openOrderIds={openOrderIds}
            onSelectOrder={openOrderInSplit}
            showWaitingTime={hub.area === 'aguardando-pagamento'}
            hideSearch
          />
        </section>
      ) : null}

      {!loading && !error && hub.tab === 'logistica' ? (
        <section className="space-y-3">
          {ordersToolbar}
          <OrdersLogisticsQueuesBar
            activeFila={logisticsFila}
            counts={logisticsCounts}
            onSelectFila={(fila) => {
              setRevisaoChip('todas')
              setHubParams({ tab: 'logistica', area: null, fila })
            }}
          />
          {isRevisaoFila ? (
            <div className="flex flex-wrap gap-2" role="group" aria-label="Filtros revisão D12">
              {REVISAO_CHIPS.map((c) => {
                const active = revisaoChip === c.id
                return (
                  <button
                    key={c.id}
                    type="button"
                    aria-pressed={active}
                    className={[
                      'min-h-9 rounded-[10px] border px-3 text-xs font-bold',
                      active
                        ? 'border-fal-accent bg-fal-accent/15 text-fal-fg'
                        : 'border-fal-line bg-fal-surface text-fal-fg',
                    ].join(' ')}
                    onClick={() => setRevisaoChip(c.id)}
                  >
                    {c.label}
                  </button>
                )
              })}
            </div>
          ) : null}
          <AdminOrdersListPanel
            rows={filteredTable}
            loading={tableLoading}
            error={tableError}
            search={search}
            onSearch={setSearch}
            selectedOrderId={selectedOrderId}
            openOrderIds={openOrderIds}
            onSelectOrder={openOrderInSplit}
            hideSearch
            columnMode={isRevisaoFila ? 'revisao' : 'default'}
            emptyTitle={
              isRevisaoFila ? 'Nenhum caso nesta revisão' : 'Nenhum pedido nesta fila'
            }
            emptyDescription={
              isRevisaoFila
                ? 'Altere o chip D12 ou a busca.'
                : 'Altere a busca ou volte ao hub.'
            }
          />
        </section>
      ) : null}
    </div>
  )

  const splitTabs = openOrderIds.map((id) => {
    const row = tableRows.find((r) => r.id === id)
    return {
      id,
      label: `#${id.slice(0, 8)}`,
      statusLabel: row ? listStatusLabel(row) : undefined,
    }
  })

  return (
    <>
      <AdaptiveWorkspace
        moduleKey="orders"
        modeApiRef={workspaceModeApiRef}
        primary={primary}
        contextualOpen={hasOpenOrderTabs}
        onContextualOpenChange={(open) => {
          if (!open) closeAllOrderTabs()
        }}
        contextualTitle={
          selectedOrderId
            ? openOrderIds.length > 1
              ? `#${selectedOrderId.slice(0, 8)} · ${openOrderIds.length} guias`
              : `Pedido #${selectedOrderId.slice(0, 8)}`
            : 'Pedido'
        }
        contextualStatusBadge={
          selectedRow ? (
            <span className="inline-flex flex-wrap items-center gap-1.5">
              <span className={badgeClass(toneForOrderStatus(selectedRow.status))}>
                {listStatusLabel(selectedRow)}
              </span>
              {selectedStageLabel ? (
                <span className="rounded-md border border-fal-navy/30 bg-fal-navy/10 px-2 py-0.5 text-[11px] font-bold text-fal-fg">
                  {selectedStageLabel}
                </span>
              ) : null}
            </span>
          ) : null
        }
        contextualExtraActions={
          selectedOrderId ? (
            <OrderRowActionsMenu orderId={selectedOrderId} utilitiesOnly />
          ) : null
        }
        contextual={
          selectedOrderId ? (
            <OrderSplitTabPanels
              orderIds={openOrderIds}
              meta={splitTabs}
              onCloseTab={closeOrderTab}
              render={(orderId) => {
                const row = tableRows.find((r) => r.id === orderId) ?? null
                const outside = !filteredTable.some((r) => r.id === orderId)
                return (
                  <OrderOpsSurface
                    orderId={orderId}
                    density="compact"
                    wave={1}
                    listRow={row}
                    outsideCurrentFilter={outside}
                    hideStatusHeader
                    onClose={() => closeOrderTab(orderId)}
                    onOpenFull={() => openFull(orderId)}
                    onRequestWideMode={(mode) =>
                      workspaceModeApiRef.current?.requestWideMode(mode)
                    }
                    onOrderChange={(ord) => rememberGuideStage(orderId, ord)}
                    onOrderMutated={() => {
                      setTableEpoch((n) => n + 1)
                      void reloadHub()
                    }}
                  />
                )
              }}
            />
          ) : null
        }
      />
      <CustomerCadastroPreviewModal
        open={customerModalOpen}
        onClose={() => setCustomerModalOpen(false)}
      />
    </>
  )
}
