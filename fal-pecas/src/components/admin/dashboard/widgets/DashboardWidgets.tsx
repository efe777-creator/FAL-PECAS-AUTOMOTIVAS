import { useDashboardData } from '@/components/admin/dashboard/DashboardDataProvider'
import { useDashboardContextual } from '@/components/admin/dashboard/DashboardContextualContext'
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
  resolveQuickControl,
  resolveWidgetContextual,
} from '@/lib/adminDashboardDeepLinks'
import {
  ADMIN_ORDER_GROUPS,
  adminActorBadgeLabel,
  adminActorKind,
  adminNextActionLabel,
  adminOrderGroupId,
  orderStatusOperatorLabel,
  sumGroupCount,
  visibleStatusesInGroup,
  type AdminActorKind,
  type AdminOrderGroupId,
} from '@/lib/adminOrderOps'
import { ADMIN_LOGISTICS_QUEUES } from '@/lib/adminLogisticsQueues'
import { canAccessAdminPath } from '@/lib/adminNavAccess'
import { formatDateTime } from '@/lib/datetime'
import { formatMoney } from '@/lib/money'
import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import {
  Area,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
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

const DASH_CHART = {
  accent: 'var(--color-fal-accent, #2563eb)',
  success: 'var(--color-fal-success, #16a34a)',
  navy: 'var(--color-fal-navy, #0f172a)',
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

function actorClass(kind: AdminActorKind): string {
  switch (kind) {
    case 'team':
      return 'bg-fal-danger/15 text-fal-fg border border-fal-danger/40'
    case 'customer':
      return 'bg-fal-accent/15 text-fal-fg border border-fal-accent/40'
    case 'wait_payment':
      return 'bg-fal-warning/15 text-fal-fg border border-fal-warning/40'
    case 'done':
      return 'bg-fal-success/15 text-fal-fg border border-fal-success/40'
  }
}

function KpiCard({
  label,
  value,
  onOpen,
  tone = 'neutral',
  hint,
  icon,
}: {
  label: string
  value: string
  onOpen: () => void
  tone?: KpiTone
  hint?: string
  icon?: string
}) {
  const toneCls: Record<KpiTone, string> = {
    neutral: 'border-fal-line',
    warning: 'border-fal-warning/35',
    danger: 'border-fal-danger/35',
    success: 'border-fal-success/35',
    info: 'border-fal-accent/35',
  }
  const iconCls: Record<KpiTone, string> = {
    neutral: 'bg-fal-bg text-fal-muted',
    warning: 'bg-fal-warning/15 text-fal-warning',
    danger: 'bg-fal-danger/15 text-fal-danger',
    success: 'bg-fal-success/15 text-fal-success',
    info: 'bg-fal-accent/15 text-fal-accent',
  }
  return (
    <button
      type="button"
      onClick={onOpen}
      className={`flex h-full w-full flex-col justify-between rounded-[14px] border bg-fal-surface px-3.5 py-3.5 text-left shadow-sm transition hover:border-fal-accent/45 hover:shadow-md ${toneCls[tone]}`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="text-[11px] font-bold uppercase tracking-wide text-fal-muted">
          {label}
        </div>
        {icon ? (
          <span
            className={`inline-flex size-8 shrink-0 items-center justify-center rounded-xl text-sm font-black ${iconCls[tone]}`}
            aria-hidden
          >
            {icon}
          </span>
        ) : null}
      </div>
      <div className="mt-2 text-2xl font-extrabold tabular-nums tracking-tight text-fal-fg md:text-[1.65rem]">
        {value}
      </div>
      {hint ? (
        <p className="mb-0 mt-1.5 text-[11px] leading-snug text-fal-muted">{hint}</p>
      ) : null}
    </button>
  )
}

export function WidgetExecSummary() {
  const {
    statusCounts,
    teamCount,
    customerCount,
    attention,
    basicTotals,
    centralIndicators,
    period,
    role,
  } = useDashboardData()
  const { setContextual } = useDashboardContextual()
  const showGmv = canAccessAdminPath('/admin/relatorios', role)
  const showCash =
    canAccessAdminPath('/admin/pagamentos', role) ||
    canAccessAdminPath('/admin/relatorios', role)

  const counts = statusCounts.data ?? {}
  const activeOrders = ADMIN_ORDER_GROUPS.filter((g) => g.id !== 'finalizados').reduce(
    (acc, g) => acc + sumGroupCount(counts, g),
    0,
  )
  const attentionTotal = teamCount + customerCount

  const loading =
    statusCounts.status === 'loading' ||
    attention.status === 'loading' ||
    (showGmv && basicTotals.status === 'loading') ||
    (showCash && centralIndicators.status === 'loading')

  const gmv =
    basicTotals.data != null
      ? formatMoney(basicTotals.data.revenueDelivered)
      : '—'
  const cash =
    centralIndicators.data != null
      ? formatMoney(centralIndicators.data.financial.captured)
      : '—'

  const cols =
    showGmv || showCash
      ? 'grid-cols-1 sm:grid-cols-2 xl:grid-cols-4'
      : 'grid-cols-1 sm:grid-cols-2'

  return (
    <div className="flex h-full flex-col gap-2 p-0.5">
      {loading ? (
        <p className="m-0 text-sm text-fal-muted">Carregando resumo…</p>
      ) : (
        <div className={`grid flex-1 gap-3 ${cols}`}>
          <KpiCard
            label="Pedidos ativos"
            value={
              statusCounts.status === 'loading' ? '…' : String(activeOrders)
            }
            onOpen={() =>
              setContextual(
                resolveWidgetContextual('pipeline-flow', {
                  pipelineGrupo: 'expedicao',
                }),
              )
            }
            tone="neutral"
            hint={period.label}
            icon="☰"
          />
          <KpiCard
            label="Exigem atenção"
            value={attention.status === 'loading' ? '…' : String(attentionTotal)}
            onOpen={() =>
              setContextual(resolveWidgetContextual('attention-table'))
            }
            tone={attentionTotal > 0 ? 'warning' : 'neutral'}
            hint={`${teamCount} equipe · ${customerCount} cliente`}
            icon="!"
          />
          {showGmv ? (
            <KpiCard
              label="GMV entregue"
              value={gmv}
              onOpen={() =>
                setContextual(resolveWidgetContextual('gmv-delivered'))
              }
              tone="info"
              hint="≠ caixa payments"
              icon="R$"
            />
          ) : null}
          {showCash ? (
            <KpiCard
              label="Caixa capturado"
              value={cash}
              onOpen={() => setContextual(resolveWidgetContextual('cash-box'))}
              tone="success"
              hint="payments · ≠ GMV"
              icon="◇"
            />
          ) : null}
        </div>
      )}
    </div>
  )
}

export function WidgetQuickControls() {
  const { firstAttention, role } = useDashboardData()
  const { setContextual, openOrder } = useDashboardContextual()
  const showReports = canAccessAdminPath('/admin/relatorios', role)
  const controls: Array<{
    id: Parameters<typeof resolveQuickControl>[0]
    label: string
    hint: string
  }> = [
    { id: 'analise', label: 'Análise', hint: 'Conferir pedidos' },
    { id: 'separacao', label: 'Separação', hint: 'Preparar itens' },
    { id: 'expedicao', label: 'Expedição', hint: 'Filas logísticas' },
    { id: 'atencao-equipe', label: 'Atenção equipe', hint: 'Ação na Central' },
    { id: 'aguardando-pag', label: 'Aguardando pag.', hint: 'Cobrança pendente' },
  ]
  if (showReports) {
    controls.push({ id: 'relatorios', label: 'Relatórios', hint: 'Visão F8' })
  }

  return (
    <div className="flex h-full flex-col gap-2 p-1">
      <h3 className="m-0 text-[11px] font-bold uppercase tracking-wide text-fal-muted">
        Controles rápidos
      </h3>
      <div className="grid flex-1 grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
        {controls.map((c) => (
          <button
            key={c.id}
            type="button"
            className="flex min-h-[4.25rem] flex-col items-start justify-center gap-0.5 rounded-[12px] border border-fal-line bg-fal-bg px-3 py-2 text-left transition hover:border-fal-accent/45 hover:bg-fal-surface-2"
            onClick={() => {
              const { contextual } = resolveQuickControl(c.id)
              if (contextual) setContextual(contextual)
            }}
          >
            <span className="text-sm font-extrabold text-fal-fg">{c.label}</span>
            <span className="text-[11px] leading-snug text-fal-muted">{c.hint}</span>
          </button>
        ))}
        {firstAttention ? (
          <button
            type="button"
            className="flex min-h-[4.25rem] flex-col items-start justify-center gap-0.5 rounded-[12px] border border-fal-warning/55 bg-fal-warning/15 px-3 py-2 text-left transition hover:bg-fal-warning/25"
            onClick={() => openOrder(firstAttention.id)}
          >
            <span className="text-sm font-extrabold text-fal-fg">Preview 1º da fila</span>
            <span className="text-[11px] leading-snug text-fal-muted">Abrir atenção</span>
          </button>
        ) : (
          <div className="flex min-h-[4.25rem] flex-col items-start justify-center gap-0.5 rounded-[12px] border border-dashed border-fal-line bg-fal-bg/50 px-3 py-2">
            <span className="text-sm font-semibold text-fal-muted">Fila vazia</span>
            <span className="text-[11px] text-fal-muted">Sem preview</span>
          </div>
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
    <div className="flex h-full flex-col gap-3 overflow-auto p-1">
      <div>
        <h3 className="m-0 text-[11px] font-bold uppercase tracking-wide text-fal-muted">
          Fixados
        </h3>
        {pinned.length === 0 ? (
          <p className="mt-1.5 text-xs text-fal-muted">Nenhum atalho fixado neste dispositivo.</p>
        ) : (
          <div className="mt-1.5 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
            {pinned.map((path) => (
              <div
                key={path}
                className="flex min-h-11 items-stretch overflow-hidden rounded-[12px] border border-fal-accent/40 bg-fal-accent/10"
              >
                <Link
                  to={path}
                  className="flex min-w-0 flex-1 items-center px-3 text-sm font-extrabold text-fal-fg hover:underline"
                >
                  <span className="truncate">{labelForShortcutPath(path)}</span>
                </Link>
                <button
                  type="button"
                  aria-label={`Desafixar ${labelForShortcutPath(path)}`}
                  onClick={() => onTogglePin(path)}
                  className="shrink-0 border-l border-fal-accent/30 px-2.5 text-sm font-bold text-fal-muted hover:bg-fal-accent/20"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div>
        <h3 className="m-0 text-[11px] font-bold uppercase tracking-wide text-fal-muted">
          Disponíveis
        </h3>
        <div className="mt-1.5 flex flex-wrap gap-1.5">
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
                    : 'border-fal-line bg-fal-bg text-fal-muted hover:border-fal-accent/40 hover:text-fal-fg',
                ].join(' ')}
              >
                {isPinned ? '✓ ' : '+ '}
                {s.label}
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}

export function WidgetPipelineFlow() {
  const { statusCounts, attention, customerCount, logisticsQueues } =
    useDashboardData()
  const { setContextual } = useDashboardContextual()
  const counts = statusCounts.data ?? {}
  const totalActive = ADMIN_ORDER_GROUPS.filter((g) => g.id !== 'finalizados').reduce(
    (acc, g) => acc + sumGroupCount(counts, g),
    0,
  )
  const [selected, setSelected] = useState<AdminOrderGroupId>('analise')

  const group = ADMIN_ORDER_GROUPS.find((g) => g.id === selected) ?? null
  const groupCount = group ? sumGroupCount(counts, group) : 0
  const statuses = group ? visibleStatusesInGroup(group, counts) : []
  const attentionRows = attention.data ?? []
  const topInGroup = attentionRows
    .filter((o) => adminOrderGroupId(o.status) === selected)
    .slice(0, 4)
  const waitPayment = counts['aguardando_pagamento'] ?? 0
  const revisao = logisticsQueues.data?.revisao ?? 0

  function attentionInGroup(groupId: AdminOrderGroupId): number {
    return attentionRows.filter((o) => adminOrderGroupId(o.status) === groupId)
      .length
  }

  return (
    <div className="flex h-full flex-col gap-3 overflow-auto p-0.5">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <h3 className="m-0 text-[11px] font-bold uppercase tracking-wide text-fal-muted">
          Fluxo do pedido
        </h3>
        <span className="text-[11px] tabular-nums text-fal-muted">
          {totalActive} em andamento
        </span>
      </div>
      <SourceBanner
        status={statusCounts.status}
        error={statusCounts.error}
        loadingLabel="Carregando fluxo…"
      />
      {statusCounts.status === 'success' || statusCounts.status === 'empty' ? (
        <>
          <div className="grid gap-2 sm:grid-cols-5">
            {ADMIN_ORDER_GROUPS.map((g, idx) => {
              const n = sumGroupCount(counts, g)
              const active = selected === g.id
              const attn = attentionInGroup(g.id)
              return (
                <button
                  key={g.id}
                  type="button"
                  onClick={() => setSelected(g.id)}
                  title={g.description}
                  className={[
                    'relative flex flex-col gap-1.5 rounded-[14px] border px-3 py-3 text-left transition',
                    active
                      ? 'border-fal-accent bg-fal-accent/10 shadow-sm ring-1 ring-fal-accent/25'
                      : 'border-fal-line bg-fal-surface hover:border-fal-accent/40',
                  ].join(' ')}
                >
                  {idx < ADMIN_ORDER_GROUPS.length - 1 ? (
                    <span
                      className="pointer-events-none absolute -right-1.5 top-1/2 z-10 hidden -translate-y-1/2 text-fal-muted sm:block"
                      aria-hidden
                    >
                      ›
                    </span>
                  ) : null}
                  <div className="flex items-center justify-between gap-1">
                    <span className="text-[10px] font-bold uppercase tracking-wide text-fal-muted">
                      {g.title}
                    </span>
                    {attn > 0 ? (
                      <span className="rounded-md bg-fal-warning/20 px-1.5 py-0.5 text-[10px] font-bold tabular-nums text-fal-fg">
                        {attn} atenção
                      </span>
                    ) : null}
                  </div>
                  <span className="text-2xl font-black tabular-nums tracking-tight text-fal-fg">
                    {n}
                  </span>
                  <div className="h-1.5 overflow-hidden rounded-full bg-fal-bg" aria-hidden>
                    <div
                      className={`h-full rounded-full ${PIPELINE_BAR[g.id] ?? 'bg-fal-accent'}`}
                      style={{
                        width: `${Math.min(100, Math.max(n > 0 ? 12 : 0, totalActive > 0 && g.id !== 'finalizados' ? (n / totalActive) * 100 : n > 0 ? 40 : 0))}%`,
                      }}
                    />
                  </div>
                </button>
              )
            })}
          </div>

          <div className="flex flex-wrap items-center gap-2 rounded-[12px] border border-fal-line bg-fal-bg/80 px-3 py-2.5">
            <span className="text-[10px] font-bold uppercase tracking-wide text-fal-muted">
              Exceções e desvios
            </span>
            <button
              type="button"
              className="inline-flex items-center gap-1.5 rounded-lg border border-fal-warning/40 bg-fal-warning/10 px-2.5 py-1 text-xs font-semibold text-fal-fg"
              onClick={() =>
                setContextual(resolveWidgetContextual('kpi-awaiting-pay'))
              }
            >
              Pag. pendente
              <span className="tabular-nums font-extrabold">{waitPayment}</span>
            </button>
            <button
              type="button"
              className="inline-flex items-center gap-1.5 rounded-lg border border-fal-accent/40 bg-fal-accent/10 px-2.5 py-1 text-xs font-semibold text-fal-fg"
              onClick={() =>
                setContextual(
                  resolveWidgetContextual('kpi-customer-action', {
                    actor: 'customer',
                  }),
                )
              }
            >
              Ação cliente
              <span className="tabular-nums font-extrabold">{customerCount}</span>
            </button>
            <button
              type="button"
              className="inline-flex items-center gap-1.5 rounded-lg border border-fal-line bg-fal-surface px-2.5 py-1 text-xs font-semibold text-fal-fg"
              onClick={() =>
                setContextual(
                  resolveWidgetContextual('logistics-queues', {
                    logisticsFila: 'revisao',
                  }),
                )
              }
            >
              Revisão
              <span className="tabular-nums font-extrabold">{revisao}</span>
            </button>
          </div>

          {group ? (
            <div className="grid flex-1 gap-4 rounded-[14px] border border-fal-line bg-fal-surface p-4 lg:grid-cols-[1fr_1.15fr]">
              <div>
                <h4 className="m-0 text-sm font-extrabold text-fal-fg">{group.title}</h4>
                <p className="mt-1 mb-3 text-xs leading-relaxed text-fal-muted">
                  {group.description}
                </p>
                <p className="m-0 text-3xl font-black tabular-nums tracking-tight text-fal-fg">
                  {groupCount}
                  <span className="ml-2 text-xs font-semibold text-fal-muted">
                    na fila
                  </span>
                </p>
                <ul className="mt-3 mb-0 list-none space-y-1.5 p-0">
                  {statuses.map((st) => (
                    <li
                      key={st}
                      className="flex justify-between gap-2 border-b border-fal-line/60 py-1 text-xs last:border-0"
                    >
                      <span className="text-fal-muted">
                        {orderStatusOperatorLabel[st] ?? st}
                      </span>
                      <span className="font-bold tabular-nums text-fal-fg">
                        {counts[st] ?? 0}
                      </span>
                    </li>
                  ))}
                </ul>
                <button
                  type="button"
                  className="mt-4 inline-flex text-xs font-bold text-fal-accent underline"
                  onClick={() =>
                    setContextual(
                      resolveWidgetContextual('pipeline-flow', {
                        pipelineGrupo: group.id,
                      }),
                    )
                  }
                >
                  Abrir fila →
                </button>
              </div>
              <div>
                <p className="m-0 text-[10px] font-bold uppercase tracking-wide text-fal-muted">
                  Prioridades neste grupo
                </p>
                {topInGroup.length === 0 ? (
                  <p className="mt-2 mb-0 text-xs text-fal-muted">
                    Nenhum na amostra de atenção.
                  </p>
                ) : (
                  <ul className="mt-2 mb-0 list-none space-y-2 p-0">
                    {topInGroup.map((o) => (
                      <li key={o.id}>
                        <button
                          type="button"
                          className="block w-full rounded-xl border border-fal-line px-3 py-2 text-left text-xs transition hover:border-fal-accent/50"
                          onClick={() =>
                            setContextual({ kind: 'order', orderId: o.id })
                          }
                        >
                          <span className="font-mono font-semibold text-fal-fg">
                            {o.id.slice(0, 8)}…
                          </span>
                          <span className="mt-0.5 block text-fal-muted">
                            {adminNextActionLabel(o.status, o.customerDecision)}
                          </span>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          ) : null}
        </>
      ) : null}
    </div>
  )
}

export function WidgetAttentionTable() {
  const { attention, teamCount, customerCount, role } = useDashboardData()
  const { contextual, openOrder, setContextual } = useDashboardContextual()
  const selectedOrderId =
    contextual?.kind === 'order' ? contextual.orderId : null
  const rows = attention.data ?? []
  const showReports = canAccessAdminPath('/admin/relatorios', role)

  return (
    <div className="flex h-full flex-col gap-2 overflow-auto p-0.5">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <h3 className="m-0 text-[11px] font-bold uppercase tracking-wide text-fal-muted">
          Fila de atenção
        </h3>
        <p className="m-0 text-[11px] text-fal-muted" aria-live="polite">
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
        <p className="rounded-[14px] border border-fal-line bg-fal-surface px-4 py-3 text-sm text-fal-muted">
          Nenhuma pendência operacional na amostra recente.
        </p>
      ) : null}
      {attention.status === 'success' ? (
        <div className="overflow-x-auto rounded-[14px] border border-fal-line bg-fal-surface">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-fal-bg text-[11px] uppercase tracking-wide text-fal-muted">
              <tr>
                <th className="px-3 py-2.5 font-bold">Pedido</th>
                <th className="px-3 py-2.5 font-bold">Situação</th>
                <th className="px-3 py-2.5 font-bold">Próxima ação</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((o) => {
                const selected = selectedOrderId === o.id
                const kind = adminActorKind(o.status, o.customerDecision)
                return (
                  <tr
                    key={o.id}
                    className={[
                      'cursor-pointer border-t border-fal-line transition',
                      selected ? 'bg-fal-accent/10' : 'hover:bg-fal-bg/60',
                    ].join(' ')}
                    onClick={() => openOrder(o.id)}
                  >
                    <td className="px-3 py-2.5 font-mono text-xs">
                      <span className="font-semibold text-fal-fg">
                        {o.id.slice(0, 8)}…
                      </span>
                      <span className="mt-0.5 block text-[11px] text-fal-muted">
                        {o.customerName ?? '—'}
                      </span>
                    </td>
                    <td className="px-3 py-2.5">
                      <span
                        className={`inline-block rounded-md px-2 py-0.5 text-[11px] font-bold ${actorClass(kind)}`}
                      >
                        {adminActorBadgeLabel(kind)}
                      </span>
                      <span className="mt-1 block text-xs text-fal-fg">
                        {orderStatusOperatorLabel[o.status] ?? o.status}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-xs font-semibold text-fal-fg">
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
        <button
          type="button"
          className="font-semibold text-fal-accent underline"
          onClick={() =>
            setContextual(resolveWidgetContextual('attention-table'))
          }
        >
          Abrir atenção →
        </button>
        {showReports ? (
          <button
            type="button"
            className="font-semibold text-fal-accent underline"
            onClick={() =>
              setContextual(resolveWidgetContextual('kpi-reports-open'))
            }
          >
            Relatórios →
          </button>
        ) : null}
      </p>
    </div>
  )
}

export function WidgetKpiAwaitingPay() {
  const { statusCounts } = useDashboardData()
  const { setContextual } = useDashboardContextual()
  const v =
    statusCounts.status === 'loading'
      ? '…'
      : String(statusCounts.data?.['aguardando_pagamento'] ?? 0)
  return (
    <KpiCard
      label="Aguardando pagamento"
      value={v}
      onOpen={() => setContextual(resolveWidgetContextual('kpi-awaiting-pay'))}
      tone="warning"
      icon="R$"
    />
  )
}

export function WidgetKpiTeamAction() {
  const { teamCount, attention } = useDashboardData()
  const { setContextual } = useDashboardContextual()
  return (
    <KpiCard
      label="Ação da equipe"
      value={attention.status === 'loading' ? '…' : String(teamCount)}
      onOpen={() => setContextual(resolveWidgetContextual('kpi-team-action'))}
      tone="danger"
      icon="!"
    />
  )
}

export function WidgetKpiCustomerAction() {
  const { customerCount, attention } = useDashboardData()
  const { setContextual } = useDashboardContextual()
  return (
    <KpiCard
      label="Ação do cliente"
      value={attention.status === 'loading' ? '…' : String(customerCount)}
      onOpen={() => setContextual(resolveWidgetContextual('kpi-customer-action'))}
      tone="info"
      icon="◎"
    />
  )
}

export function WidgetKpiReportsOpen() {
  const { basicTotals } = useDashboardData()
  const { setContextual } = useDashboardContextual()
  const v =
    basicTotals.status === 'loading'
      ? '…'
      : String(basicTotals.data?.ordersOpen ?? '—')
  return (
    <KpiCard
      label="Em aberto"
      value={v}
      onOpen={() => setContextual(resolveWidgetContextual('kpi-reports-open'))}
      tone="neutral"
    />
  )
}

export function WidgetKpiReportsDelivered() {
  const { basicTotals } = useDashboardData()
  const { setContextual } = useDashboardContextual()
  const v =
    basicTotals.status === 'loading'
      ? '…'
      : String(basicTotals.data?.ordersDelivered ?? '—')
  return (
    <KpiCard
      label="Entregues"
      value={v}
      onOpen={() =>
        setContextual(resolveWidgetContextual('kpi-reports-delivered'))
      }
      tone="success"
    />
  )
}

export function WidgetGmvDelivered() {
  const { basicTotals } = useDashboardData()
  const { setContextual } = useDashboardContextual()
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
      onOpen={() => setContextual(resolveWidgetContextual('gmv-delivered'))}
      tone="info"
      hint="≠ caixa"
    />
  )
}

export function WidgetCashBox() {
  const { centralIndicators } = useDashboardData()
  const { setContextual } = useDashboardContextual()
  const ind = centralIndicators.data
  return (
    <button
      type="button"
      className="flex h-full w-full flex-col p-1 text-left"
      onClick={() => setContextual(resolveWidgetContextual('cash-box'))}
    >
      <h3 className="m-0 text-xs font-bold uppercase tracking-wide text-fal-muted">
        Caixa (payments)
      </h3>
      <p className="mt-1 mb-2 text-xs text-fal-muted">
        Distinto da receita GMV entregue. Abre Financeiro da Central.
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
      <p className="mb-0 mt-auto pt-2 text-xs font-semibold text-fal-accent">
        Ver financeiro →
      </p>
    </button>
  )
}

export function WidgetLogisticsQueues() {
  const { logisticsQueues } = useDashboardData()
  const { setContextual } = useDashboardContextual()
  const counts = logisticsQueues.data

  const cells: Array<{
    id: (typeof DASHBOARD_LOGISTICS_QUEUE_IDS)[number]
    label: string
    value: number
    warning?: boolean
  }> = [
    {
      id: 'etiquetas-me',
      label: 'Aguardando expedição',
      value: counts?.['etiquetas-me'] ?? 0,
    },
    {
      id: 'volumes',
      label: 'Volumes',
      value: counts?.volumes ?? 0,
    },
    {
      id: 'entregas-proprias',
      label: 'Entregas próprias',
      value: counts?.['entregas-proprias'] ?? 0,
    },
    {
      id: 'revisao',
      label: 'Em revisão',
      value: counts?.revisao ?? 0,
      warning: (counts?.revisao ?? 0) > 0,
    },
  ]

  return (
    <div className="flex h-full flex-col overflow-auto p-0.5">
      <h3 className="m-0 text-[11px] font-bold uppercase tracking-wide text-fal-muted">
        Logística
      </h3>
      <SourceBanner
        status={logisticsQueues.status}
        error={logisticsQueues.error}
        loadingLabel="Carregando filas…"
      />
      {counts ? (
        <div className="mt-2 grid flex-1 grid-cols-2 gap-2">
          {cells.map((c) => {
            const q = ADMIN_LOGISTICS_QUEUES.find((x) => x.id === c.id)
            const body = (
              <>
                <span className="text-[10px] font-bold uppercase tracking-wide text-fal-muted">
                  {c.label}
                </span>
                <span className="mt-1.5 text-xl font-extrabold tabular-nums text-fal-fg">
                  {c.value}
                </span>
              </>
            )
            const cls = [
              'flex flex-col justify-center rounded-[14px] border px-3 py-3 transition hover:border-fal-accent/50',
              c.warning
                ? 'border-fal-warning/40 bg-fal-warning/10'
                : 'border-fal-line bg-fal-surface',
            ].join(' ')
            if (c.id === 'revisao' && q) {
              return (
                <Link key={c.id} to={q.path} className={cls}>
                  {body}
                </Link>
              )
            }
            return (
              <button
                key={c.id}
                type="button"
                className={`${cls} w-full text-left`}
                onClick={() =>
                  setContextual(
                    resolveWidgetContextual('logistics-queues', {
                      logisticsFila: c.id,
                    }),
                  )
                }
              >
                {body}
              </button>
            )
          })}
        </div>
      ) : null}
    </div>
  )
}

function shortDate(iso: string): string {
  const parts = iso.split('-')
  if (parts.length !== 3) return iso
  return `${parts[2]}/${parts[1]}`
}

export function WidgetChartPerformance() {
  const { dailySeries, period, role } = useDashboardData()
  const { setContextual } = useDashboardContextual()
  const canGmv = canAccessAdminPath('/admin/relatorios', role)
  const days = dailySeries.data?.days ?? []
  const chartData = days.map((d) => ({
    label: shortDate(d.date),
    gmv: canGmv ? (d.gmvDelivered ?? 0) : undefined,
    capturado: d.captured,
  }))

  return (
    <div className="flex h-full flex-col gap-2 p-0.5">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h3 className="m-0 text-[11px] font-bold uppercase tracking-wide text-fal-muted">
            Desempenho
          </h3>
          <p className="m-0 text-xs text-fal-muted">
            {period.label}
            {canGmv ? ' · GMV entregue ≠ caixa capturado' : ' · caixa capturado'}
          </p>
        </div>
        <button
          type="button"
          className="text-xs font-semibold text-fal-accent underline"
          onClick={() =>
            setContextual(resolveWidgetContextual('chart-performance'))
          }
        >
          Ver detalhes →
        </button>
      </div>
      <SourceBanner
        status={dailySeries.status}
        error={dailySeries.error}
        loadingLabel="Carregando série…"
      />
      {dailySeries.status === 'empty' ? (
        <p className="m-0 text-sm text-fal-muted">Sem dados no período selecionado.</p>
      ) : null}
      {dailySeries.status === 'success' ? (
        <div className="min-h-[200px] flex-1">
          <ResponsiveContainer width="100%" height="100%" minHeight={200}>
            <ComposedChart data={chartData} accessibilityLayer>
              <CartesianGrid strokeDasharray="3 3" className="stroke-fal-line" />
              <XAxis dataKey="label" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} width={56} />
              <Tooltip
                formatter={(value, name) => [
                  typeof value === 'number'
                    ? formatMoney(value)
                    : String(value ?? ''),
                  String(name),
                ]}
              />
              <Legend />
              {canGmv ? (
                <Area
                  type="monotone"
                  dataKey="gmv"
                  name="GMV entregue"
                  stroke={DASH_CHART.accent}
                  fill={DASH_CHART.accent}
                  fillOpacity={0.15}
                  isAnimationActive={false}
                />
              ) : null}
              <Line
                type="monotone"
                dataKey="capturado"
                name="Caixa capturado"
                stroke={DASH_CHART.success}
                dot={false}
                isAnimationActive={false}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      ) : null}
    </div>
  )
}

export function WidgetChartGmvSeries() {
  const { dailySeries, period } = useDashboardData()
  const { setContextual } = useDashboardContextual()
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
        <button
          type="button"
          className="text-xs font-semibold text-fal-accent underline"
          onClick={() =>
            setContextual(resolveWidgetContextual('chart-gmv-series'))
          }
        >
          Relatórios →
        </button>
      </div>
      <SourceBanner
        status={dailySeries.status}
        error={dailySeries.error}
        loadingLabel="Carregando série…"
      />
      {dailySeries.status === 'success' ? (
        <div className="min-h-[180px] flex-1">
          <ResponsiveContainer width="100%" height="100%" minHeight={180}>
            <ComposedChart data={chartData} accessibilityLayer>
              <CartesianGrid strokeDasharray="3 3" className="stroke-fal-line" />
              <XAxis dataKey="label" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} width={56} />
              <Tooltip />
              <Legend />
              <Area
                type="monotone"
                dataKey="gmv"
                name="GMV entregue"
                stroke={DASH_CHART.accent}
                fill={DASH_CHART.accent}
                fillOpacity={0.2}
                isAnimationActive={false}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      ) : null}
    </div>
  )
}

export function WidgetChartCashSeries() {
  const { dailySeries, period } = useDashboardData()
  const { setContextual } = useDashboardContextual()
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
        <button
          type="button"
          className="text-xs font-semibold text-fal-accent underline"
          onClick={() =>
            setContextual(resolveWidgetContextual('chart-cash-series'))
          }
        >
          Financeiro →
        </button>
      </div>
      <SourceBanner
        status={dailySeries.status}
        error={dailySeries.error}
        loadingLabel="Carregando série…"
      />
      {dailySeries.status === 'success' ? (
        <div className="min-h-[180px] flex-1">
          <ResponsiveContainer width="100%" height="100%" minHeight={180}>
            <ComposedChart data={chartData} accessibilityLayer>
              <CartesianGrid strokeDasharray="3 3" className="stroke-fal-line" />
              <XAxis dataKey="label" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} width={56} />
              <Tooltip />
              <Legend />
              <Line
                type="monotone"
                dataKey="capturado"
                name="Capturado"
                stroke={DASH_CHART.success}
                dot={false}
                isAnimationActive={false}
              />
              <Line
                type="monotone"
                dataKey="liquido"
                name="Líquido do dia"
                stroke={DASH_CHART.navy}
                dot={false}
                isAnimationActive={false}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      ) : null}
    </div>
  )
}

const WIDGET_COMPONENTS: Record<string, () => ReactNode> = {
  'exec-summary': () => <WidgetExecSummary />,
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
  'chart-performance': () => <WidgetChartPerformance />,
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
