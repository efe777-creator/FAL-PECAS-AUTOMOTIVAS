import {
  ADMIN_ORDER_GROUPS,
  adminActorBadgeLabel,
  adminActorKind,
  adminNextActionLabel,
  attentionSortKey,
  isAttentionOrder,
  orderStatusOperatorLabel,
  sumGroupCount,
  visibleStatusesInGroup,
} from '@/lib/adminOrderOps'
import { useAuth } from '@/contexts/AuthContext'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { canAccessAdminPath } from '@/lib/adminNavAccess'
import { formatDateTime } from '@/lib/datetime'
import { formatMoney } from '@/lib/money'
import { toUserMessage } from '@/lib/toUserMessage'
import {
  adminListOrders,
  adminOrderStatusCounts,
  type AdminOrderListRow,
} from '@/services/admin/adminOrderService'
import {
  adminBasicTotals,
  staffCanViewReportsF8,
  type AdminBasicTotals,
} from '@/services/admin/adminReportsService'
import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'

type KpiTone = 'neutral' | 'warning' | 'danger' | 'success' | 'info'

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

export function AdminDashboardPage() {
  useDocumentTitle('Painel | Admin FAL')
  const { user } = useAuth()
  const [counts, setCounts] = useState<Record<string, number>>({})
  const [orders, setOrders] = useState<AdminOrderListRow[]>([])
  const [totals, setTotals] = useState<AdminBasicTotals | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    void (async () => {
      setLoading(true)
      try {
        const [c, list, canReports] = await Promise.all([
          adminOrderStatusCounts(),
          adminListOrders(null),
          staffCanViewReportsF8().catch(() => false),
        ])
        setCounts(c)
        setOrders(list)
        if (canReports) {
          try {
            setTotals(await adminBasicTotals())
          } catch {
            setTotals(null)
          }
        } else {
          setTotals(null)
        }
        setLoadError(null)
      } catch (e) {
        setLoadError(toUserMessage(e, 'Falha ao carregar pedidos'))
        setCounts({})
        setOrders([])
        setTotals(null)
      } finally {
        setLoading(false)
      }
    })()
  }, [])

  const attention = useMemo(() => {
    return orders
      .filter((o) => isAttentionOrder(o.status, o.customerDecision))
      .sort((a, b) => {
        const ka = attentionSortKey(a.status, a.customerDecision)
        const kb = attentionSortKey(b.status, b.customerDecision)
        if (ka !== kb) return ka - kb
        return b.createdAt.localeCompare(a.createdAt)
      })
      .slice(0, 12)
  }, [orders])

  const teamCount = attention.filter(
    (o) => adminActorKind(o.status, o.customerDecision) === 'team',
  ).length
  const customerCount = attention.filter(
    (o) => adminActorKind(o.status, o.customerDecision) === 'customer',
  ).length

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <header>
        <h1 className="text-2xl font-extrabold text-fal-fg md:text-3xl">Painel</h1>
        <p className="mt-1 max-w-2xl text-sm text-fal-muted md:text-base">
          Visão operacional do dia: o que precisa de ação, indicadores e fluxo de pedidos. Use o menu
          lateral para abrir cada módulo.
        </p>
      </header>

      {loadError ? <p className="text-sm text-fal-danger">{loadError}</p> : null}

      <section className="space-y-2" aria-label="Indicadores operacionais">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <h2 className="m-0 text-xs font-bold uppercase tracking-wide text-fal-muted">
            Indicadores
          </h2>
          {canAccessAdminPath('/admin/relatorios', user?.role) ? (
            <Link
              to="/admin/relatorios"
              className="text-xs font-semibold text-fal-accent underline-offset-2 hover:underline"
            >
              Relatórios →
            </Link>
          ) : null}
        </div>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          <Kpi
            label="Aguardando pagamento"
            value={loading ? '…' : String(counts['aguardando_pagamento'] ?? 0)}
            to="/admin/pedidos/lista?status=aguardando_pagamento"
            tone="warning"
            icon="💳"
          />
          <Kpi
            label="Ação da equipe"
            value={loading ? '…' : String(teamCount)}
            to="/admin/pedidos"
            tone="danger"
            icon="⚡"
          />
          <Kpi
            label="Ação do cliente"
            value={loading ? '…' : String(customerCount)}
            to="/admin/pedidos"
            tone="info"
            icon="👤"
          />
          <Kpi
            label="Em aberto"
            value={loading ? '…' : String(totals?.ordersOpen ?? '—')}
            to="/admin/relatorios"
            tone="neutral"
            icon="📋"
          />
          <Kpi
            label="Entregues"
            value={loading ? '…' : String(totals?.ordersDelivered ?? '—')}
            to="/admin/relatorios"
            tone="success"
            icon="✓"
          />
          <Kpi
            label="Receita entregue"
            value={
              loading
                ? '…'
                : totals
                  ? formatMoney(totals.revenueDelivered)
                  : '—'
            }
            to="/admin/relatorios"
            tone="info"
            icon="R$"
          />
        </div>
        <p className="m-0 text-xs text-fal-muted">
          Sem série temporal neste painel — variações % e gráficos ficam para quando houver histórico
          confiável.
        </p>
      </section>

      <section className="space-y-3">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <h2 className="m-0 text-xs font-bold uppercase tracking-wide text-fal-muted">
            Pedidos que precisam de atenção
          </h2>
          <p className="m-0 text-xs text-fal-muted" aria-live="polite">
            {loading
              ? 'Carregando contagens…'
              : `${teamCount} ação da equipe · ${customerCount} ação do cliente`}
          </p>
        </div>
        {loading ? (
          <p className="rounded-[12px] border border-fal-line bg-fal-surface px-4 py-3 text-sm text-fal-muted">
            Carregando pendências…
          </p>
        ) : attention.length === 0 ? (
          <p className="rounded-[12px] border border-fal-line bg-fal-surface px-4 py-3 text-sm text-fal-muted">
            Nenhuma pendência operacional na amostra recente. Pedidos só aguardando pagamento ficam
            no bloco Pagamento.
          </p>
        ) : (
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
                {attention.map((o) => {
                  const kind = adminActorKind(o.status, o.customerDecision)
                  return (
                    <tr key={o.id} className="border-t border-fal-line">
                      <td className="px-3 py-2 font-mono text-xs">
                        <Link
                          to={`/admin/pedidos/${o.id}`}
                          className="font-semibold text-fal-fg underline-offset-2 hover:underline"
                        >
                          {o.id.slice(0, 8)}…
                        </Link>
                      </td>
                      <td className="px-3 py-2 text-fal-fg">{o.customerName ?? '—'}</td>
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
        )}
        <p className="m-0 text-xs text-fal-muted">
          <Link to="/admin/pedidos" className="font-semibold text-fal-accent underline">
            Abrir Central de Pedidos →
          </Link>
        </p>
      </section>

      <section className="space-y-4">
        <h2 className="text-xs font-bold uppercase tracking-wide text-fal-muted">
          Fluxo operacional
        </h2>
        {loading ? (
          <p className="rounded-[14px] border border-fal-line bg-fal-surface px-4 py-6 text-sm text-fal-muted">
            Carregando fluxo operacional…
          </p>
        ) : (
          <div className="grid gap-4 lg:grid-cols-2">
            {ADMIN_ORDER_GROUPS.map((group) => {
              const total = sumGroupCount(counts, group)
              const statuses = visibleStatusesInGroup(group, counts)
              return (
                <div
                  key={group.id}
                  className="rounded-[14px] border border-fal-line bg-fal-surface p-4 shadow-sm"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="m-0 text-base font-extrabold text-fal-fg">{group.title}</h3>
                      <p className="mb-0 mt-1 text-xs text-fal-muted">{group.description}</p>
                    </div>
                    <Link
                      to={`/admin/pedidos/lista?grupo=${group.id}`}
                      className="shrink-0 text-2xl font-black text-fal-fg tabular-nums"
                      title="Abrir listagem do grupo"
                    >
                      {total}
                    </Link>
                  </div>
                  <ul className="mt-3 m-0 list-none space-y-1.5 p-0">
                    {statuses.map((s) => (
                      <li key={s}>
                        <Link
                          to={`/admin/pedidos/lista?status=${s}`}
                          className="flex items-center justify-between gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-fal-bg"
                        >
                          <span className="text-fal-fg">
                            {orderStatusOperatorLabel[s] ?? s}
                          </span>
                          <span className="font-extrabold tabular-nums text-fal-fg">
                            {counts[s] ?? 0}
                          </span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              )
            })}
          </div>
        )}
      </section>
    </div>
  )
}

function Kpi({
  label,
  value,
  to,
  tone = 'neutral',
  icon,
}: {
  label: string
  value: string
  to: string
  tone?: KpiTone
  icon?: string
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
      className={`rounded-[12px] border bg-fal-surface px-3 py-3 shadow-sm transition hover:border-fal-accent/50 ${toneCls[tone]}`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="text-[11px] font-bold uppercase tracking-wide text-fal-muted">{label}</div>
        {icon ? (
          <span className="text-sm opacity-70" aria-hidden>
            {icon}
          </span>
        ) : null}
      </div>
      <div className="mt-1 text-xl font-extrabold tabular-nums text-fal-fg">{value}</div>
    </Link>
  )
}
