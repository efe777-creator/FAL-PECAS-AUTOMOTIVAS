import { OrderPreviewPanel } from '@/components/admin/orders/OrderPreviewPanel'
import { OrderRowActionsMenu } from '@/components/admin/orders/OrderRowActionsMenu'
import { AdaptiveWorkspace } from '@/components/admin/workspace/AdaptiveWorkspace'
import { Button } from '@/components/common/Button'
import { ErrorState } from '@/components/common/ErrorState'
import { Loading } from '@/components/common/Loading'
import { useToast } from '@/components/common/Toast'
import {
  ADMIN_LOGISTICS_QUEUES,
  type AdminLogisticsQueueId,
} from '@/lib/adminLogisticsQueues'
import {
  ADMIN_ORDER_AREAS,
  ADMIN_ORDER_VIEWS,
  adminNextActionLabel,
  attentionSortKey,
  getAdminOrderArea,
  isAttentionOrder,
  sumAreaCount,
} from '@/lib/adminOrderOps'
import {
  filterOrdersBySearch,
  listStatusLabel,
  AdminOrdersListPanel,
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
import { formatDateTime } from '@/lib/datetime'
import { formatMoney } from '@/lib/money'
import {
  ADMIN_LIST_PAGE_SIZE,
  adminCentralIndicators,
  adminListLogisticsQueue,
  adminListOrders,
  adminLogisticsQueueCounts,
  adminOrderStatusCounts,
  type AdminCentralIndicators,
  type AdminOrderListRow,
} from '@/services/admin/adminOrderService'
import type { LogisticsQueueCounts } from '@/lib/adminLogisticsQueues'
import { useCallback, useEffect, useMemo, useState } from 'react'
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
  'transito',
  'entregues',
]

const ATTENTION_STATUSES = [
  'pagamento_aprovado',
  'recebido',
  'em_analise',
  'aguardando_disponibilidade',
  'aguardando_decisao',
  'confirmado',
  'em_separacao',
  'pronto_para_envio',
] as const

function parseFila(raw: string | null): AdminLogisticsQueueId {
  if (raw && EXPEDICAO_FILAS.includes(raw as AdminLogisticsQueueId)) {
    return raw as AdminLogisticsQueueId
  }
  return 'volumes'
}

export function AdminOrdersHubPage() {
  useDocumentTitle('Pedidos | Admin FAL')
  const toast = useToast()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const hub = parseOrdersHubSearch(searchParams.toString())

  const [attentionRows, setAttentionRows] = useState<AdminOrderListRow[]>([])
  const [recent, setRecent] = useState<AdminOrderListRow[]>([])
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
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null)

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

  async function reloadHub() {
    setLoading(true)
    setError(null)
    try {
      const [attentionList, recentList, c, ind, lq] = await Promise.all([
        adminListOrders(null, { statuses: [...ATTENTION_STATUSES], limit: ADMIN_LIST_PAGE_SIZE }),
        adminListOrders(null, { limit: 6 }),
        adminOrderStatusCounts(),
        adminCentralIndicators().catch(() => null),
        adminLogisticsQueueCounts().catch(() => null),
      ])
      setAttentionRows(attentionList)
      setRecent(recentList)
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
    if (hub.tab === 'visao-geral' || hub.tab === 'financeiro') {
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
        if (hub.tab === 'logistica') {
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
  }, [hub.tab, hub.area, hub.fila])

  const attention = useMemo(() => {
    return attentionRows
      .filter((o) => isAttentionOrder(o.status, o.customerDecision))
      .sort(
        (a, b) =>
          attentionSortKey(a.status, a.customerDecision) -
          attentionSortKey(b.status, b.customerDecision),
      )
      .slice(0, 8)
  }, [attentionRows])

  const filteredTable = useMemo(
    () => filterOrdersBySearch(tableRows, search),
    [tableRows, search],
  )

  const selectedRow = useMemo(
    () =>
      tableRows.find((r) => r.id === selectedOrderId) ??
      attentionRows.find((r) => r.id === selectedOrderId) ??
      recent.find((r) => r.id === selectedOrderId) ??
      null,
    [tableRows, attentionRows, recent, selectedOrderId],
  )

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
    rememberOrdersReturnPath(
      `${window.location.pathname}${window.location.search}`,
    )
    navigate(`/admin/pedidos/${id}`)
  }

  const primary = (
    <div className="space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold text-fal-fg">Central de Pedidos</h1>
          <p className="mt-1 max-w-2xl text-sm text-fal-muted">
            Workspace adaptativo — abas, preview e página completa. Operações pesadas só no
            detalhe.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="light"
            disabled={busyExpire || loading}
            onClick={() => void runExpireUnpaid()}
          >
            {busyExpire ? 'Expirando…' : 'Retirar não pagos (48 h)'}
          </Button>
          <Link
            to="/admin/pedidos/lista"
            className="inline-flex items-center rounded-[10px] border border-fal-line bg-fal-surface px-3 py-2 text-sm font-semibold text-fal-fg"
          >
            Lista avançada
          </Link>
        </div>
      </header>

      <nav
        className="flex flex-wrap gap-1 rounded-[12px] border border-fal-line bg-fal-surface p-1"
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
                active
                  ? 'bg-fal-navy text-white'
                  : 'text-fal-fg hover:bg-fal-bg',
              ].join(' ')}
              onClick={() => {
                setSelectedOrderId(null)
                setHubParams({
                  tab: t.id,
                  area: t.id === 'comercial' ? hub.area ?? 'aguardando-pagamento' : t.id === 'pedidos' ? hub.area : null,
                  fila: t.id === 'logistica' ? hub.fila ?? 'volumes' : null,
                })
              }}
            >
              {t.label}
            </button>
          )
        })}
      </nav>

      {loading ? <Loading label="Carregando central…" /> : null}
      {!loading && error ? <ErrorState message={error} /> : null}

      {!loading && !error && hub.tab === 'visao-geral' ? (
        <>
          {indicators ? (
            <section className="space-y-3" aria-label="Indicadores">
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                <div className="rounded-[12px] border border-fal-line bg-fal-surface px-3 py-2">
                  <p className="m-0 text-[11px] font-semibold uppercase tracking-wide text-fal-muted">
                    Pedidos criados
                  </p>
                  <p className="m-0 mt-1 text-xl font-extrabold tabular-nums text-fal-fg">
                    {indicators.operational.ordersCreated}
                  </p>
                </div>
                <div className="rounded-[12px] border border-fal-line bg-fal-surface px-3 py-2">
                  <p className="m-0 text-[11px] font-semibold uppercase tracking-wide text-fal-muted">
                    Aguardando decisão
                  </p>
                  <p className="m-0 mt-1 text-xl font-extrabold tabular-nums text-fal-fg">
                    {indicators.operational.awaitingDecision}
                  </p>
                </div>
                <div className="rounded-[12px] border border-fal-line bg-fal-surface px-3 py-2">
                  <p className="m-0 text-[11px] font-semibold uppercase tracking-wide text-fal-muted">
                    Cancel. pendente
                  </p>
                  <p className="m-0 mt-1 text-xl font-extrabold tabular-nums text-fal-fg">
                    {indicators.operational.cancellationPending}
                  </p>
                </div>
                <div className="rounded-[12px] border border-fal-line bg-fal-surface px-3 py-2">
                  <p className="m-0 text-[11px] font-semibold uppercase tracking-wide text-fal-muted">
                    Cancelados
                  </p>
                  <p className="m-0 mt-1 text-xl font-extrabold tabular-nums text-fal-fg">
                    {indicators.operational.cancelled}
                  </p>
                </div>
              </div>
              <div className="grid gap-2 sm:grid-cols-3">
                <div className="rounded-[12px] border border-fal-line bg-fal-surface px-3 py-2">
                  <p className="m-0 text-[11px] font-semibold uppercase text-fal-muted">Capturado</p>
                  <p className="m-0 mt-1 text-base font-extrabold tabular-nums">
                    {formatMoney(indicators.financial.captured)}
                  </p>
                </div>
                <div className="rounded-[12px] border border-fal-line bg-fal-surface px-3 py-2">
                  <p className="m-0 text-[11px] font-semibold uppercase text-fal-muted">Devolvido</p>
                  <p className="m-0 mt-1 text-base font-extrabold tabular-nums">
                    {formatMoney(indicators.financial.refunded)}
                  </p>
                </div>
                <div className="rounded-[12px] border border-fal-navy/40 bg-fal-surface px-3 py-2">
                  <p className="m-0 text-[11px] font-semibold uppercase text-fal-muted">
                    Recebido líquido
                  </p>
                  <p className="m-0 mt-1 text-base font-extrabold tabular-nums">
                    {formatMoney(indicators.financial.netReceived)}
                  </p>
                </div>
              </div>
            </section>
          ) : null}

          <section className="grid gap-4 lg:grid-cols-2">
            <div className="rounded-[14px] border border-fal-line bg-fal-surface p-4">
              <h2 className="mt-0 text-base font-extrabold text-fal-fg">Exigem atenção</h2>
              {attention.length === 0 ? (
                <p className="text-sm text-fal-muted">Nenhuma pendência operacional agora.</p>
              ) : (
                <ul className="mt-2 space-y-2">
                  {attention.map((o) => (
                    <li key={o.id} className="flex items-start justify-between gap-2 text-sm">
                      <button
                        type="button"
                        className="min-w-0 text-left"
                        onClick={() => setSelectedOrderId(o.id)}
                      >
                        <span className="font-semibold text-fal-fg">
                          {o.id.slice(0, 8)}… · {o.customerName ?? 'Cliente'}
                        </span>
                        <p className="mb-0 mt-0.5 text-xs font-extrabold text-fal-fg">
                          Faça agora:{' '}
                          {o.logisticsNextActionLabel ??
                            adminNextActionLabel(o.status, o.customerDecision)}
                        </p>
                        <p className="mb-0 mt-0.5 text-xs text-fal-muted">
                          {listStatusLabel(o)}
                          {o.shippingChoiceLabel ? ` · ${o.shippingChoiceLabel}` : ''}
                        </p>
                      </button>
                      <span className="shrink-0 font-semibold">{formatMoney(o.total)}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="rounded-[14px] border border-fal-line bg-fal-surface p-4">
              <h2 className="mt-0 text-base font-extrabold text-fal-fg">Mais recentes</h2>
              <ul className="mt-2 space-y-2">
                {recent.map((o) => (
                  <li key={o.id} className="flex items-start justify-between gap-2 text-sm">
                    <button
                      type="button"
                      className="min-w-0 text-left"
                      onClick={() => setSelectedOrderId(o.id)}
                    >
                      <span className="font-semibold text-fal-fg">
                        {o.id.slice(0, 8)}… · {o.customerName ?? 'Cliente'}
                      </span>
                      <p className="mb-0 mt-0.5 text-xs text-fal-muted">
                        {formatDateTime(o.createdAt)} · {listStatusLabel(o)}
                      </p>
                    </button>
                    <span className="shrink-0 font-semibold">{formatMoney(o.total)}</span>
                  </li>
                ))}
              </ul>
            </div>
          </section>

          <p className="text-xs text-fal-muted">
            Visões e atalhos:{' '}
            <Link to="/admin/avisos" className="font-semibold text-fal-accent">
              Notificações
            </Link>
            {ADMIN_ORDER_VIEWS.slice(0, 4).map((v) => (
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

      {!loading && !error && hub.tab === 'financeiro' && indicators ? (
        <section className="space-y-3" aria-label="Financeiro">
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {(
              [
                ['Capturado', indicators.financial.captured],
                ['Devolvido', indicators.financial.refunded],
                ['Recebido líquido', indicators.financial.netReceived],
                ['Bruto vendido', indicators.financial.grossSold],
                ['Valor cancelados', indicators.financial.cancelledAmount],
                ['Pag. pendente', indicators.financial.pendingPayment],
              ] as const
            ).map(([label, value]) => (
              <div
                key={label}
                className="rounded-[12px] border border-fal-line bg-fal-surface px-3 py-2"
              >
                <p className="m-0 text-[11px] font-semibold uppercase text-fal-muted">{label}</p>
                <p className="m-0 mt-1 text-base font-extrabold tabular-nums">
                  {formatMoney(value)}
                </p>
              </div>
            ))}
          </div>
          <Link to="/admin/pedidos/lista" className="text-sm font-semibold text-fal-accent">
            Ver pedidos na lista avançada →
          </Link>
        </section>
      ) : null}

      {!loading && !error && (hub.tab === 'pedidos' || hub.tab === 'comercial') ? (
        <section className="space-y-3">
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
            onSelectOrder={setSelectedOrderId}
            showWaitingTime={hub.area === 'aguardando-pagamento'}
          />
        </section>
      ) : null}

      {!loading && !error && hub.tab === 'logistica' ? (
        <section className="space-y-3">
          <div className="flex flex-wrap gap-2" role="group" aria-label="Filas logísticas">
            {ADMIN_LOGISTICS_QUEUES.filter((q) => q.id !== 'revisao').map((q) => {
              const active = parseFila(hub.fila) === q.id
              const n = logisticsCounts?.[q.id] ?? null
              return (
                <button
                  key={q.id}
                  type="button"
                  aria-pressed={active}
                  className={[
                    'min-h-11 rounded-[10px] border px-3 text-sm font-bold',
                    active
                      ? 'border-fal-navy bg-fal-navy text-white'
                      : 'border-fal-line bg-fal-surface text-fal-fg',
                  ].join(' ')}
                  onClick={() =>
                    setHubParams({ tab: 'logistica', area: null, fila: q.id })
                  }
                >
                  {q.title}
                  {n != null ? ` (${n})` : ''}
                </button>
              )
            })}
            <Link
              to="/admin/pedidos/visao/revisao-logistica"
              className="inline-flex min-h-11 items-center rounded-[10px] border border-fal-line bg-fal-surface px-3 text-sm font-bold text-fal-fg"
            >
              Revisão
            </Link>
          </div>
          <AdminOrdersListPanel
            rows={filteredTable}
            loading={tableLoading}
            error={tableError}
            search={search}
            onSearch={setSearch}
            selectedOrderId={selectedOrderId}
            onSelectOrder={setSelectedOrderId}
          />
        </section>
      ) : null}
    </div>
  )

  return (
    <AdaptiveWorkspace
      moduleKey="orders"
      primary={primary}
      contextualOpen={!!selectedOrderId}
      onContextualOpenChange={(open) => {
        if (!open) setSelectedOrderId(null)
      }}
      contextualTitle={
        selectedOrderId ? `Pedido ${selectedOrderId.slice(0, 8)}…` : 'Pedido'
      }
      contextualExtraActions={
        selectedOrderId ? (
          <OrderRowActionsMenu
            orderId={selectedOrderId}
            onOpenFull={() => openFull(selectedOrderId)}
          />
        ) : null
      }
      contextual={
        selectedOrderId ? (
          <OrderPreviewPanel
            orderId={selectedOrderId}
            listRow={selectedRow}
            onClose={() => setSelectedOrderId(null)}
            onOpenFull={() => openFull(selectedOrderId)}
          />
        ) : null
      }
    />
  )
}
