import { EmptyState } from '@/components/common/EmptyState'
import { ErrorState } from '@/components/common/ErrorState'
import { Input } from '@/components/common/Input'
import { Loading } from '@/components/common/Loading'
import {
  adminActorBadgeLabel,
  adminActorKind,
  adminNextActionLabel,
  orderStatusOperatorLabel,
} from '@/lib/adminOrderOps'
import { rememberOrdersReturnPath } from '@/lib/adminOrdersNav'
import { formatDateTime } from '@/lib/datetime'
import { formatMoney } from '@/lib/money'
import type { AdminOrderListRow } from '@/services/admin/adminOrderService'
import { Link, useLocation } from 'react-router-dom'

function actorClass(kind: ReturnType<typeof adminActorKind>): string {
  switch (kind) {
    case 'team':
      return 'bg-amber-100 text-amber-950'
    case 'customer':
      return 'bg-sky-100 text-sky-950'
    case 'wait_payment':
      return 'bg-fal-bg text-fal-muted'
    case 'done':
      return 'bg-green-100 text-green-900'
  }
}

function paymentBadge(o: AdminOrderListRow) {
  if (!o.paymentStatus) return '—'
  const expired =
    o.paymentExpiresAt != null && new Date(o.paymentExpiresAt).getTime() < Date.now()
  if (expired && o.paymentStatus === 'pending') return 'Pendente (expirado)'
  const map: Record<string, string> = {
    pending: 'Pendente',
    approved: 'Aprovado',
    rejected: 'Recusado',
    cancelled: 'Cancelado',
    refunded: 'Estornado',
    expired: 'Expirado',
  }
  return map[o.paymentStatus] ?? o.paymentStatus
}

export function waitingPaymentHours(createdAt: string): string {
  const ms = Date.now() - new Date(createdAt).getTime()
  const h = Math.max(0, Math.floor(ms / 3_600_000))
  if (h < 48) return `${h} h`
  return `${h} h (elegível expire)`
}

type Props = {
  rows: AdminOrderListRow[]
  loading: boolean
  error: string | null
  search: string
  onSearch: (v: string) => void
  /** Extra column for separation preview */
  showItemPreview?: boolean
  itemPreviewByOrderId?: Record<string, string>
  emptyTitle?: string
  emptyDescription?: string
  showWaitingTime?: boolean
  /** Coluna com contagem de itens (lista avançada). */
  showItemCount?: boolean
}

export function AdminOrdersListPanel({
  rows,
  loading,
  error,
  search,
  onSearch,
  showItemPreview,
  itemPreviewByOrderId,
  emptyTitle = 'Nenhum pedido nesta fila',
  emptyDescription = 'Altere a busca ou volte ao hub.',
  showWaitingTime,
  showItemCount,
}: Props) {
  const location = useLocation()
  function rememberReturn() {
    rememberOrdersReturnPath(`${location.pathname}${location.search}`)
  }

  return (
    <div className="space-y-3">
      <div className="max-w-md">
        <Input
          label="Busca (número / cliente)"
          value={search}
          onChange={(e) => onSearch(e.target.value)}
          placeholder="Ex.: a1b2c3d4 ou nome"
        />
      </div>

      {loading ? <Loading label="Carregando pedidos…" /> : null}
      {!loading && error ? <ErrorState message={error} /> : null}

      {!loading && !error && rows.length === 0 ? (
        <EmptyState title={emptyTitle} description={emptyDescription} />
      ) : null}

      {!loading && !error && rows.length > 0 ? (
        <>
          <div className="space-y-3 md:hidden">
            {rows.map((o) => {
              const kind = adminActorKind(o.status, o.customerDecision)
              return (
                <article
                  key={o.id}
                  className="rounded-[14px] border border-fal-line bg-white p-3 shadow-sm"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="m-0 font-mono text-xs text-fal-muted">{o.id.slice(0, 8)}…</p>
                      <p className="mb-0 mt-0.5 text-sm font-extrabold text-fal-navy">
                        {o.customerName ?? 'Cliente'}
                      </p>
                      <p className="m-0 text-xs text-fal-muted">{formatDateTime(o.createdAt)}</p>
                    </div>
                    <p className="m-0 shrink-0 text-sm font-bold">{formatMoney(o.total)}</p>
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <span
                      className={`inline-block rounded-md px-2 py-0.5 text-[11px] font-bold ${actorClass(kind)}`}
                    >
                      {adminActorBadgeLabel(kind)}
                    </span>
                    <span className="text-xs text-fal-muted">
                      {orderStatusOperatorLabel[o.status] ?? o.status}
                    </span>
                  </div>
                  <p className="mb-0 mt-2 text-xs font-semibold text-fal-navy">
                    Próxima: {adminNextActionLabel(o.status, o.customerDecision)}
                  </p>
                  <p className="mb-0 mt-1 text-xs text-fal-muted">Pagamento: {paymentBadge(o)}</p>
                  {showWaitingTime ? (
                    <p className="mb-0 mt-1 text-xs text-fal-muted">
                      Aguardando: {waitingPaymentHours(o.createdAt)}
                    </p>
                  ) : null}
                  {showItemPreview ? (
                    <p className="mb-0 mt-1 text-xs text-fal-muted">
                      {itemPreviewByOrderId?.[o.id] ?? `${o.itemCount} item(ns)`}
                    </p>
                  ) : null}
                  {showItemCount && !showItemPreview ? (
                    <p className="mb-0 mt-1 text-xs text-fal-muted">{o.itemCount} item(ns)</p>
                  ) : null}
                  <Link
                    to={`/admin/pedidos/${o.id}`}
                    onClick={rememberReturn}
                    className="mt-3 inline-flex min-h-11 items-center rounded-[10px] bg-fal-navy px-3 text-sm font-bold text-white"
                  >
                    Abrir pedido
                  </Link>
                </article>
              )
            })}
          </div>

          <div className="hidden overflow-x-auto rounded-[14px] border border-fal-line bg-white md:block">
            <table className="min-w-full text-left text-sm">
              <thead className="border-b border-fal-line bg-fal-bg text-xs uppercase text-fal-muted">
                <tr>
                  <th className="px-3 py-2">Pedido</th>
                  <th className="px-3 py-2">Cliente</th>
                  <th className="px-3 py-2">Data</th>
                  {showWaitingTime ? <th className="px-3 py-2">Tempo aguardando</th> : null}
                  <th className="px-3 py-2">Situação</th>
                  <th className="px-3 py-2">Próxima ação</th>
                  {showItemPreview ? <th className="px-3 py-2">Produtos</th> : null}
                  {showItemCount ? <th className="px-3 py-2">Itens</th> : null}
                  <th className="px-3 py-2">Pagamento</th>
                  <th className="px-3 py-2">Total</th>
                  <th className="px-3 py-2" />
                </tr>
              </thead>
              <tbody>
                {rows.map((o) => {
                  const kind = adminActorKind(o.status, o.customerDecision)
                  return (
                    <tr
                      key={o.id}
                      className="border-b border-fal-line last:border-0 hover:bg-fal-bg/60"
                    >
                      <td className="px-3 py-2 font-mono text-xs">{o.id.slice(0, 8)}…</td>
                      <td className="px-3 py-2">{o.customerName ?? '—'}</td>
                      <td className="px-3 py-2 whitespace-nowrap">{formatDateTime(o.createdAt)}</td>
                      {showWaitingTime ? (
                        <td className="px-3 py-2 text-xs">{waitingPaymentHours(o.createdAt)}</td>
                      ) : null}
                      <td className="px-3 py-2">
                        <span
                          className={`inline-block rounded-md px-2 py-0.5 text-[11px] font-bold ${actorClass(kind)}`}
                        >
                          {adminActorBadgeLabel(kind)}
                        </span>
                        <span className="mt-1 block text-xs">
                          {orderStatusOperatorLabel[o.status] ?? o.status}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-xs font-semibold text-fal-navy">
                        {adminNextActionLabel(o.status, o.customerDecision)}
                      </td>
                      {showItemPreview ? (
                        <td className="px-3 py-2 max-w-[220px] text-xs text-fal-muted">
                          {itemPreviewByOrderId?.[o.id] ?? `${o.itemCount} item(ns)`}
                        </td>
                      ) : null}
                      {showItemCount ? (
                        <td className="px-3 py-2">{o.itemCount}</td>
                      ) : null}
                      <td className="px-3 py-2 text-xs">{paymentBadge(o)}</td>
                      <td className="px-3 py-2 font-semibold">{formatMoney(o.total)}</td>
                      <td className="px-3 py-2">
                        <Link
                          to={`/admin/pedidos/${o.id}`}
                          onClick={rememberReturn}
                          className="text-sm font-semibold text-fal-navy underline"
                        >
                          Abrir
                        </Link>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </>
      ) : null}
    </div>
  )
}

export function filterOrdersBySearch(rows: AdminOrderListRow[], raw: string): AdminOrderListRow[] {
  const q = raw.trim().toLowerCase()
  if (!q) return rows
  return rows.filter(
    (o) =>
      o.id.toLowerCase().includes(q) ||
      (o.customerName?.toLowerCase().includes(q) ?? false) ||
      (o.paymentStatus?.toLowerCase().includes(q) ?? false),
  )
}
