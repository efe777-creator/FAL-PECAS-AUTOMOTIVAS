import { useDashboardData } from '@/components/admin/dashboard/DashboardDataProvider'
import { useDashboardOrderPreview } from '@/components/admin/dashboard/DashboardOrderPreviewContext'
import {
  labelForShortcutPath,
  listDashboardShortcutsForRole,
} from '@/lib/adminDashboardShortcuts'
import {
  readAdminDashboardPrefs,
  togglePinnedPath,
  writeAdminDashboardPrefs,
} from '@/lib/adminDashboardPrefs'
import {
  ADMIN_ORDER_GROUPS,
  adminActorBadgeLabel,
  adminActorKind,
  adminNextActionLabel,
  orderStatusOperatorLabel,
  sumGroupCount,
} from '@/lib/adminOrderOps'
import { ADMIN_LOGISTICS_QUEUES } from '@/lib/adminLogisticsQueues'
import { canAccessAdminPath } from '@/lib/adminNavAccess'
import { formatDateTime } from '@/lib/datetime'
import { formatMoney } from '@/lib/money'
import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import {
  Area,
  AreaChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

const PIPELINE_BAR: Record<string, string> = {
  pagamento: 'bg-fal-warning',
  analise: 'bg-fal-accent',
  preparacao: 'bg-fal-navy',
  expedicao: 'bg-fal-success',
  finalizados: 'bg-fal-muted',
}

const DASHBOARD_LOGISTICS_QUEUE_IDS = [
  'volumes',
  'etiquetas-me',
  'entregas-proprias',
  'revisao',
] as const

type KpiTone = 'neutral' | 'warning' | 'danger' | 'success' | 'info'

function SourceBanner({
  status,
  error,
  loadingLabel,
}: {
  status: string
  error: string | null
  loadingLabel: string
}) {
  if (status === 'loading') {
    return <p className="m-0 text-sm text-fal-muted">{loadingLabel}</p>
  }
  if (status === 'error') {
    return <p className="m-0 text-sm text-fal-danger">{error ?? 'Erro'}</p>
  }
  return null
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-fal-line bg-fal-bg px-2.5 py-2">
      <div className="text-[10px] font-bold uppercase tracking-wide text-fal-muted">
        {label}
      </div>
      <div className="mt-0.5 text-sm font-extrabold tabular-nums text-fal-fg">
        {value}
      </div>
    </div>
  )
}

function KpiCard({
  label,
  value,
  to,
  tone = 'neutral',
}: {
  label: string
  value: string
  to: string
  tone?: KpiTone
}) {
  const toneCls: Record<KpiTone, string> = {
    neutral: 'border-fal-line',
    warning: 'border-fal-warning/40 bg-fal-warning/10',
    danger: 'border-fal-danger/40 bg-fal-danger/10',
    success: 'border-fal-success/40 bg-fal-success/10',
    info: 'border-fal-accent/40 bg-fal-accent/10',
  }
  return (
    <Link
      to={to}
      className={`block h-full rounded-[12px] border bg-fal-surface px-3 py-3 shadow-sm transition hover:border-fal-accent/50 ${toneCls[tone]}`}
    >
      <div className="text-[11px] font-bold uppercase tracking-wide text-fal-muted">
        {label}
      </div>
      <div className="mt-1 text-xl font-extrabold tabular-nums text-fal-fg">
        {value}
      </div>
    </Link>
  )
}

function actorClass(kind: ReturnType<typeof adminActorKind>): string {
  switch (kind) {
    case 'team':
      return 'bg-fal-warning/15 text-fal-fg border border-fal-warning/40'
    case 'customer':
      return 'bg-fal-accent/15 text-fal-fg border border-fal-accent/40'
    case 'wait_payment':
      return 'bg-fal-bg text-fal-muted border border-fal-line'
    case 'done':
      return 'bg-fal-success/15 text-fal-fg border border-fal-success/40'
  }
}

export function WidgetQuickControls() {
  const { firstAttention, role } = useDashboardData()
  const { setSelectedOrderId } = useDashboardOrderPreview()
  const showReports = canAccessAdminPath('/admin/relatorios', role)
  const controls: Array<{ label: string; to: string; hint?: string }> = [
    { label: 'Análise', to: '/admin/pedidos?tab=comercial&area=analise', hint: 'Conferir pedidos' },
    { label: 'Separação', to: '/admin/pedidos?tab=pedidos&area=separacao', hint: 'Preparar itens' },
    { label: 'Expedição', to: '/admin/pedidos?tab=logistica', hint: 'Filas logísticas' },
    { label: 'Atenção equipe', to: '/admin/pedidos', hint: 'Central' },
    {
      label: 'Aguardando pag.',
      to: '/admin/pedidos/lista?status=aguardando_pagamento',
    },
  ]
  if (showReports) controls.push({ label: 'Relatórios', to: '/admin/relatorios' })

  return (
    <div className="flex h-full flex-col gap-2 p-1">
      <h3 className="m-0 text-xs font-bold uppercase tracking-wide text-fal-muted">
        Controles rápidos
      </h3>
      <div className="flex flex-wrap gap-2">
        {controls.map((c) => (
          <Link
            key={c.to + c.label}
            to={c.to}
            title={c.hint}
            className="inline-flex min-h-10 items-center rounded-lg border border-fal-line bg-fal-surface px-3 text-sm font-semibold text-fal-fg transition hover:border-fal-accent/50"
          >
            {c.label}
          </Link>
        ))}
        {firstAttention ? (
          <button
            type="button"
            className="inline-flex min-h-10 items-center rounded-lg border border-fal-warning/50 bg-fal-warning/10 px-3 text-sm font-bold text-fal-fg"
            onClick={() => setSelectedOrderId(firstAttention.id)}
          >
            Preview 1º da fila
          </button>
        ) : (
          <span className="inline-flex min-h-10 items-center rounded-lg border border-dashed border-fal-line px-3 text-sm text-fal-muted">
            Fila vazia
          </span>
        )}
      </div>
    </div>
  )
}

export function WidgetShortcutsPinned() {
  const { role } = useDashboardData()
  const catalog = useMemo(() => listDashboardShortcutsForRole(role), [role])
  const allowedPaths = useMemo(() => catalog.map((s) => s.to), [catalog])
  const [pinned, setPinned] = useState<string[]>([])

  useEffect(() => {
    setPinned(readAdminDashboardPrefs(allowedPaths, role).pinned)
  }, [allowedPaths, role])

  function onTogglePin(path: string) {
    const next = togglePinnedPath(path, pinned, allowedPaths)
    setPinned(writeAdminDashboardPrefs({ pinned: next }, allowedPaths).pinned)
  }

  return (
    <div className="flex h-full flex-col gap-2 overflow-auto p-1">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <h3 className="m-0 text-xs font-bold uppercase tracking-wide text-fal-muted">
          Atalhos
        </h3>
        <p className="m-0 text-xs text-fal-muted">Pin local neste dispositivo</p>
      </div>
      <div className="flex flex-wrap gap-2">
        {pinned.map((path) => (
          <div
            key={path}
            className="inline-flex min-h-10 items-stretch overflow-hidden rounded-lg border border-fal-accent/40 bg-fal-accent/10"
          >
            <Link
              to={path}
              className="inline-flex items-center px-3 text-sm font-semibold text-fal-fg hover:underline"
            >
              {labelForShortcutPath(path)}
            </Link>
            <button
              type="button"
              aria-label={`Desafixar ${labelForShortcutPath(path)}`}
              onClick={() => onTogglePin(path)}
              className="border-l border-fal-accent/30 px-2 text-xs font-bold text-fal-muted hover:bg-fal-accent/20"
            >
              ×
            </button>
          </div>
        ))}
      </div>
      <div className="flex flex-wrap gap-1.5">
        {catalog.map((s) => {
          const isPinned = pinned.includes(s.to)
          return (
            <button
              key={s.to}
              type="button"
              aria-pressed={isPinned}
              onClick={() => onTogglePin(s.to)}
              className={[
                'inline-flex min-h-8 items-center rounded-md border px-2.5 text-xs font-semibold',
                isPinned
                  ? 'border-fal-accent bg-fal-accent text-white'
                  : 'border-fal-line bg-fal-bg text-fal-muted hover:text-fal-fg',
              ].join(' ')}
            >
              {isPinned ? '✓ ' : '+ '}
              {s.label}
            </button>
          )
        })}
      </div>
    </div>
  )
}

export function WidgetPipelineFlow() {
  const { statusCounts } = useDashboardData()
  const counts = statusCounts.data ?? {}
  const total = ADMIN_ORDER_GROUPS.reduce(
    (acc, g) => acc + sumGroupCount(counts, g),
    0,
  )

  return (
    <div className="flex h-full flex-col gap-2 overflow-auto p-1">
      <h3 className="m-0 text-xs font-bold uppercase tracking-wide text-fal-muted">
        Fluxo do pedido
      </h3>
      <SourceBanner
        status={statusCounts.status}
        error={statusCounts.error}
        loadingLabel="Carregando fluxo…"
      />
      {statusCounts.status === 'success' || statusCounts.status === 'empty' ? (
        <div className="grid flex-1 gap-2 sm:grid-cols-5">
          {ADMIN_ORDER_GROUPS.map((group) => {
            const n = sumGroupCount(counts, group)
            const pct = total > 0 ? Math.round((n / total) * 100) : 0
            return (
              <Link
                key={group.id}
                to={`/admin/pedidos/lista?grupo=${group.id}`}
                className="flex flex-col gap-2 rounded-lg p-2 transition hover:bg-fal-bg"
                title={group.description}
              >
                <div className="flex items-baseline justify-between gap-2">
                  <span className="text-xs font-bold uppercase tracking-wide text-fal-muted">
                    {group.title}
                  </span>
                  <span className="text-lg font-black tabular-nums text-fal-fg">
                    {n}
                  </span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-fal-bg" aria-hidden>
                  <div
                    className={`h-full rounded-full ${PIPELINE_BAR[group.id] ?? 'bg-fal-accent'}`}
                    style={{ width: `${Math.max(pct, n > 0 ? 8 : 0)}%` }}
                  />
                </div>
                <span className="text-[11px] text-fal-muted tabular-nums">
                  {pct}% do fluxo
                </span>
              </Link>
            )
          })}
        </div>
      ) : null}
    </div>
  )
}

export function WidgetAttentionTable() {
  const { attention, teamCount, customerCount, role } = useDashboardData()
  const { selectedOrderId, setSelectedOrderId } = useDashboardOrderPreview()
  const rows = attention.data ?? []
  const showReports = canAccessAdminPath('/admin/relatorios', role)

  return (
    <div className="flex h-full flex-col gap-2 overflow-auto p-1">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <h3 className="m-0 text-xs font-bold uppercase tracking-wide text-fal-muted">
          Pedidos que precisam de atenção
        </h3>
        <p className="m-0 text-xs text-fal-muted" aria-live="polite">
          {attention.status === 'loading'
            ? 'Carregando…'
            : `${teamCount} equipe · ${customerCount} cliente`}
        </p>
      </div>
      <SourceBanner
        status={attention.status}
        error={attention.error}
        loadingLabel="Carregando pendências…"
      />
      {attention.status === 'empty' ? (
        <p className="rounded-[12px] border border-fal-line bg-fal-surface px-4 py-3 text-sm text-fal-muted">
          Nenhuma pendência operacional na amostra recente.
        </p>
      ) : null}
      {attention.status === 'success' ? (
        <div className="overflow-x-auto rounded-[14px] border border-fal-line bg-fal-surface">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-fal-bg text-fal-muted">
              <tr>
                <th className="px-3 py-2">Pedido</th>
                <th className="px-3 py-2">Cliente</th>
                <th className="px-3 py-2">Quando</th>
                <th className="px-3 py-2">Situação</th>
                <th className="px-3 py-2">Próxima ação</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((o) => {
                const kind = adminActorKind(o.status, o.customerDecision)
                const selected = selectedOrderId === o.id
                return (
                  <tr
                    key={o.id}
                    className={[
                      'cursor-pointer border-t border-fal-line',
                      selected ? 'bg-fal-accent/10' : '',
                    ].join(' ')}
                    onClick={() => setSelectedOrderId(o.id)}
                  >
                    <td className="px-3 py-2 font-mono text-xs">
                      <Link
                        to={`/admin/pedidos/${o.id}`}
                        className="font-semibold text-fal-fg underline-offset-2 hover:underline"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {o.id.slice(0, 8)}…
                      </Link>
                    </td>
                    <td className="px-3 py-2 text-fal-fg">
                      {o.customerName ?? '—'}
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap text-xs text-fal-muted">
                      {formatDateTime(o.createdAt)}
                    </td>
                    <td className="px-3 py-2">
                      <span
                        className={`inline-block rounded-md px-2 py-0.5 text-[11px] font-bold ${actorClass(kind)}`}
                      >
                        {adminActorBadgeLabel(kind)}
                      </span>
                      <span className="mt-1 block text-xs text-fal-fg">
                        {orderStatusOperatorLabel[o.status] ?? o.status}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-xs font-semibold text-fal-fg">
                      {adminNextActionLabel(o.status, o.customerDecision)}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      ) : null}
      <p className="m-0 flex flex-wrap gap-3 text-xs">
        <Link to="/admin/pedidos" className="font-semibold text-fal-accent underline">
          Abrir Central →
        </Link>
        {showReports ? (
          <Link
            to="/admin/relatorios"
            className="font-semibold text-fal-accent underline"
          >
            Relatórios →
          </Link>
        ) : null}
      </p>
    </div>
  )
}

export function WidgetKpiAwaitingPay() {
  const { statusCounts } = useDashboardData()
  const v =
    statusCounts.status === 'loading'
      ? '…'
      : String(statusCounts.data?.['aguardando_pagamento'] ?? 0)
  return (
    <KpiCard
      label="Aguardando pagamento"
      value={v}
      to="/admin/pedidos/lista?status=aguardando_pagamento"
      tone="warning"
    />
  )
}

export function WidgetKpiTeamAction() {
  const { teamCount, attention } = useDashboardData()
  return (
    <KpiCard
      label="Ação da equipe"
      value={attention.status === 'loading' ? '…' : String(teamCount)}
      to="/admin/pedidos"
      tone="danger"
    />
  )
}

export function WidgetKpiCustomerAction() {
  const { customerCount, attention } = useDashboardData()
  return (
    <KpiCard
      label="Ação do cliente"
      value={attention.status === 'loading' ? '…' : String(customerCount)}
      to="/admin/pedidos"
      tone="info"
    />
  )
}

export function WidgetKpiReportsOpen() {
  const { basicTotals } = useDashboardData()
  const v =
    basicTotals.status === 'loading'
      ? '…'
      : String(basicTotals.data?.ordersOpen ?? '—')
  return <KpiCard label="Em aberto" value={v} to="/admin/relatorios" tone="neutral" />
}

export function WidgetKpiReportsDelivered() {
  const { basicTotals } = useDashboardData()
  const v =
    basicTotals.status === 'loading'
      ? '…'
      : String(basicTotals.data?.ordersDelivered ?? '—')
  return (
    <KpiCard label="Entregues" value={v} to="/admin/relatorios" tone="success" />
  )
}

export function WidgetGmvDelivered() {
  const { basicTotals } = useDashboardData()
  const v =
    basicTotals.status === 'loading'
      ? '…'
      : basicTotals.data
        ? formatMoney(basicTotals.data.revenueDelivered)
        : '—'
  return (
    <KpiCard
      label="Receita entregue (GMV)"
      value={v}
      to="/admin/relatorios"
      tone="info"
    />
  )
}

export function WidgetCashBox() {
  const { centralIndicators, role } = useDashboardData()
  const ind = centralIndicators.data
  return (
    <div className="flex h-full flex-col p-1">
      <h3 className="m-0 text-xs font-bold uppercase tracking-wide text-fal-muted">
        Caixa (payments)
      </h3>
      <p className="mt-1 mb-2 text-xs text-fal-muted">
        Distinto da receita GMV entregue.
      </p>
      <SourceBanner
        status={centralIndicators.status}
        error={centralIndicators.error}
        loadingLabel="Carregando caixa…"
      />
      {ind ? (
        <div className="grid grid-cols-3 gap-2">
          <MiniStat label="Líquido" value={formatMoney(ind.financial.netReceived)} />
          <MiniStat label="Capturado" value={formatMoney(ind.financial.captured)} />
          <MiniStat
            label="Pag. pendente"
            value={formatMoney(ind.financial.pendingPayment)}
          />
        </div>
      ) : null}
      {canAccessAdminPath('/admin/pagamentos', role) ? (
        <p className="mb-0 mt-auto pt-2 text-xs">
          <Link
            to="/admin/pagamentos"
            className="font-semibold text-fal-accent underline-offset-2 hover:underline"
          >
            Pagamentos →
          </Link>
        </p>
      ) : null}
    </div>
  )
}

export function WidgetLogisticsQueues() {
  const { logisticsQueues } = useDashboardData()
  const counts = logisticsQueues.data
  return (
    <div className="flex h-full flex-col overflow-auto p-1">
      <h3 className="m-0 text-xs font-bold uppercase tracking-wide text-fal-muted">
        Filas logística
      </h3>
      <p className="mt-1 mb-2 text-xs text-fal-muted">Mesmas contagens da Central.</p>
      <SourceBanner
        status={logisticsQueues.status}
        error={logisticsQueues.error}
        loadingLabel="Carregando filas…"
      />
      {counts ? (
        <ul className="m-0 grid list-none gap-1.5 p-0 sm:grid-cols-2">
          {DASHBOARD_LOGISTICS_QUEUE_IDS.map((id) => {
            const q = ADMIN_LOGISTICS_QUEUES.find((x) => x.id === id)
            if (!q) return null
            return (
              <li key={id}>
                <Link
                  to={q.path}
                  className="flex items-center justify-between gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-fal-bg"
                >
                  <span className="text-fal-fg">{q.title}</span>
                  <span className="font-extrabold tabular-nums text-fal-fg">
                    {counts[id] ?? 0}
                  </span>
                </Link>
              </li>
            )
          })}
        </ul>
      ) : null}
    </div>
  )
}

function shortDate(iso: string): string {
  const parts = iso.split('-')
  if (parts.length !== 3) return iso
  return `${parts[2]}/${parts[1]}`
}

export function WidgetChartGmvSeries() {
  const { dailySeries, period } = useDashboardData()
  const days = dailySeries.data?.days ?? []
  const chartData = days.map((d) => ({
    label: shortDate(d.date),
    gmv: d.gmvDelivered ?? 0,
    entregues: d.ordersDelivered ?? 0,
  }))
  const gmvSum = days.reduce((a, d) => a + (d.gmvDelivered ?? 0), 0)
  const delSum = days.reduce((a, d) => a + (d.ordersDelivered ?? 0), 0)
  const ticket = delSum > 0 ? gmvSum / delSum : null

  return (
    <div className="flex h-full flex-col gap-2 p-1">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h3 className="m-0 text-xs font-bold uppercase tracking-wide text-fal-muted">
            Série GMV entregue
          </h3>
          <p className="m-0 text-xs text-fal-muted">
            {period.label} · ≠ caixa payments
            {ticket != null ? ` · ticket médio ${formatMoney(ticket)}` : null}
          </p>
        </div>
        <Link
          to="/admin/relatorios"
          className="text-xs font-semibold text-fal-accent underline"
        >
          Relatórios →
        </Link>
      </div>
      <SourceBanner
        status={dailySeries.status}
        error={dailySeries.error}
        loadingLabel="Carregando série…"
      />
      {dailySeries.status === 'success' ? (
        <div className="min-h-[180px] flex-1">
          <ResponsiveContainer width="100%" height="100%" minHeight={180}>
            <AreaChart data={chartData} accessibilityLayer>
              <CartesianGrid strokeDasharray="3 3" className="stroke-fal-line" />
              <XAxis dataKey="label" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} width={56} />
              <Tooltip />
              <Legend />
              <Area
                type="monotone"
                dataKey="gmv"
                name="GMV entregue"
                stroke="var(--color-fal-accent, #2563eb)"
                fill="var(--color-fal-accent, #2563eb)"
                fillOpacity={0.2}
                isAnimationActive={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      ) : null}
    </div>
  )
}

export function WidgetChartCashSeries() {
  const { dailySeries, period } = useDashboardData()
  const days = dailySeries.data?.days ?? []
  const chartData = days.map((d) => ({
    label: shortDate(d.date),
    capturado: d.captured,
    liquido: d.netDay,
  }))

  return (
    <div className="flex h-full flex-col gap-2 p-1">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h3 className="m-0 text-xs font-bold uppercase tracking-wide text-fal-muted">
            Série caixa (payments)
          </h3>
          <p className="m-0 text-xs text-fal-muted">
            {period.label} · capturado / líquido diário (≠ GMV)
          </p>
        </div>
        <Link
          to="/admin/pagamentos"
          className="text-xs font-semibold text-fal-accent underline"
        >
          Pagamentos →
        </Link>
      </div>
      <SourceBanner
        status={dailySeries.status}
        error={dailySeries.error}
        loadingLabel="Carregando série…"
      />
      {dailySeries.status === 'success' ? (
        <div className="min-h-[180px] flex-1">
          <ResponsiveContainer width="100%" height="100%" minHeight={180}>
            <LineChart data={chartData} accessibilityLayer>
              <CartesianGrid strokeDasharray="3 3" className="stroke-fal-line" />
              <XAxis dataKey="label" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} width={56} />
              <Tooltip />
              <Legend />
              <Line
                type="monotone"
                dataKey="capturado"
                name="Capturado"
                stroke="var(--color-fal-success, #16a34a)"
                dot={false}
                isAnimationActive={false}
              />
              <Line
                type="monotone"
                dataKey="liquido"
                name="Líquido do dia"
                stroke="var(--color-fal-navy, #0f172a)"
                dot={false}
                isAnimationActive={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      ) : null}
    </div>
  )
}

const WIDGET_COMPONENTS: Record<string, () => ReactNode> = {
  'quick-controls': () => <WidgetQuickControls />,
  'shortcuts-pinned': () => <WidgetShortcutsPinned />,
  'attention-table': () => <WidgetAttentionTable />,
  'pipeline-flow': () => <WidgetPipelineFlow />,
  'kpi-awaiting-pay': () => <WidgetKpiAwaitingPay />,
  'kpi-team-action': () => <WidgetKpiTeamAction />,
  'kpi-customer-action': () => <WidgetKpiCustomerAction />,
  'kpi-reports-open': () => <WidgetKpiReportsOpen />,
  'kpi-reports-delivered': () => <WidgetKpiReportsDelivered />,
  'gmv-delivered': () => <WidgetGmvDelivered />,
  'cash-box': () => <WidgetCashBox />,
  'logistics-queues': () => <WidgetLogisticsQueues />,
  'chart-gmv-series': () => <WidgetChartGmvSeries />,
  'chart-cash-series': () => <WidgetChartCashSeries />,
}

export function renderDashboardWidget(widgetId: string): ReactNode {
  const factory = WIDGET_COMPONENTS[widgetId]
  if (!factory) {
    return (
      <p className="m-0 p-3 text-sm text-fal-muted">Widget indisponível ({widgetId})</p>
    )
  }
  return factory()
}
