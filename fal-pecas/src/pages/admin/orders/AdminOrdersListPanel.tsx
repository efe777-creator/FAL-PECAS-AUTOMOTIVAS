import { OrderRowActionsMenu } from '@/components/admin/orders/OrderRowActionsMenu'
import {
  badgeClass,
  toneForOrderStatus,
  toneForPaymentStatus,
} from '@/components/admin/orders/orderStatusTone'
import { EmptyState } from '@/components/common/EmptyState'
import { ErrorState } from '@/components/common/ErrorState'
import { Input } from '@/components/common/Input'
import { Loading } from '@/components/common/Loading'
import { adminNextActionLabel, orderStatusOperatorLabel } from '@/lib/adminOrderOps'
import { rememberOrdersReturnPath } from '@/lib/adminOrdersNav'
import { formatDateTime } from '@/lib/datetime'
import { formatMoney, formatMoneyInput, parseMoneyBr } from '@/lib/money'
import type { AdminOrderListRow } from '@/services/admin/adminOrderService'
import { Link, useLocation, useNavigate } from 'react-router-dom'

function paymentLabel(o: AdminOrderListRow): string {
  if (!o.paymentStatus) return '—'
  const expired =
    o.paymentExpiresAt != null && new Date(o.paymentExpiresAt).getTime() < Date.now()
  if (expired && o.paymentStatus === 'pending') return 'Pendente (expirado)'
  const map: Record<string, string> = {
    pending: 'Pendente',
    approved: 'Pago',
    rejected: 'Recusado',
    cancelled: 'Cancelado',
    refunded: 'Estornado',
    expired: 'Expirado',
  }
  return map[o.paymentStatus] ?? o.paymentStatus
}

/** Status operacional ciente de retirada (lista). */
export function listStatusLabel(o: AdminOrderListRow): string {
  if (o.pickup && o.status === 'entregue') return 'Retirada feita'
  if (
    o.pickup &&
    (o.status === 'enviado' ||
      (o.pickupAuthorized &&
        (o.status === 'pronto_para_envio' || o.status === 'preparando_envio')))
  ) {
    return 'Pronto para retirar'
  }
  return orderStatusOperatorLabel[o.status] ?? o.status
}

function nextActionLabel(o: AdminOrderListRow): string {
  return o.logisticsNextActionLabel ?? adminNextActionLabel(o.status, o.customerDecision)
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
  showItemPreview?: boolean
  itemPreviewByOrderId?: Record<string, string>
  emptyTitle?: string
  emptyDescription?: string
  showWaitingTime?: boolean
  showItemCount?: boolean
  selectedOrderId?: string | null
  onSelectOrder?: (orderId: string) => void
  /** Busca já no header do hub. */
  hideSearch?: boolean
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
  selectedOrderId,
  onSelectOrder,
  hideSearch,
}: Props) {
  const location = useLocation()
  const navigate = useNavigate()
  function rememberReturn() {
    rememberOrdersReturnPath(`${location.pathname}${location.search}`)
  }

  function openFull(id: string) {
    rememberReturn()
    navigate(`/admin/pedidos/${id}`)
  }

  return (
    <div className="space-y-3">
      {!hideSearch ? (
        <div className="max-w-md">
          <Input
            label="Buscar: nº, cliente, CPF, item, valor…"
            value={search}
            onChange={(e) => onSearch(e.target.value)}
            placeholder="Ex.: CPF, SKU, 150,90…"
          />
        </div>
      ) : null}

      {loading ? <Loading label="Carregando pedidos…" /> : null}
      {!loading && error ? <ErrorState message={error} /> : null}

      {!loading && !error && rows.length === 0 ? (
        <EmptyState title={emptyTitle} description={emptyDescription} />
      ) : null}

      {!loading && !error && rows.length > 0 ? (
        <div className="fal-admin-scroll max-h-[min(60dvh,640px)] overflow-y-auto overflow-x-auto rounded-[14px] border border-fal-line bg-fal-surface">
          <div className="space-y-3 p-3 md:hidden">
            {rows.map((o) => {
              const next = nextActionLabel(o)
              const selected = selectedOrderId === o.id
              return (
                <article
                  key={o.id}
                  className={[
                    'rounded-[14px] border bg-fal-surface p-3 shadow-sm',
                    selected ? 'border-fal-accent ring-2 ring-fal-accent/30' : 'border-fal-line',
                    onSelectOrder ? 'cursor-pointer' : '',
                  ].join(' ')}
                  onClick={() => onSelectOrder?.(o.id)}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="m-0 font-mono text-xs text-fal-muted">{o.id.slice(0, 8)}…</p>
                      <p className="mb-0 mt-0.5 text-sm font-extrabold text-fal-fg">
                        {o.customerName ?? 'Cliente'}
                      </p>
                    </div>
                    <p className="m-0 shrink-0 text-sm font-bold">{formatMoney(o.total)}</p>
                  </div>

                  <div className="mt-2 rounded-[10px] border border-fal-yellow-dark/40 bg-fal-yellow/15 px-2.5 py-2">
                    <p className="m-0 text-[10px] font-bold uppercase tracking-wide text-fal-fg/70">
                      Faça agora
                    </p>
                    <p className="mb-0 mt-0.5 text-sm font-extrabold text-fal-fg">{next}</p>
                  </div>

                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <span className={badgeClass(toneForOrderStatus(o.status))}>
                      {listStatusLabel(o)}
                    </span>
                    {o.shippingChoiceLabel ? (
                      <span className="rounded-md border border-green-300 bg-green-50 px-2 py-0.5 text-[11px] font-bold text-green-950">
                        {o.shippingChoiceLabel}
                      </span>
                    ) : null}
                  </div>

                  <p className="mb-0 mt-2 text-xs text-fal-muted">
                    {formatDateTime(o.createdAt)} ·{' '}
                    <span className={badgeClass(toneForPaymentStatus(o.paymentStatus))}>
                      {paymentLabel(o)}
                    </span>
                    {showWaitingTime ? ` · Aguardando ${waitingPaymentHours(o.createdAt)}` : ''}
                  </p>
                  {showItemPreview ? (
                    <p className="mb-0 mt-1 text-xs text-fal-muted">
                      {itemPreviewByOrderId?.[o.id] ?? `${o.itemCount} item(ns)`}
                    </p>
                  ) : null}
                  {showItemCount && !showItemPreview ? (
                    <p className="mb-0 mt-1 text-xs text-fal-muted">{o.itemCount} item(ns)</p>
                  ) : null}
                  <div
                    className="mt-3 flex flex-wrap items-center gap-2"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {onSelectOrder ? (
                      <button
                        type="button"
                        className="inline-flex min-h-11 items-center rounded-[10px] bg-fal-navy px-3 text-sm font-bold text-white"
                        onClick={() => onSelectOrder(o.id)}
                      >
                        Abrir
                      </button>
                    ) : (
                      <Link
                        to={`/admin/pedidos/${o.id}`}
                        onClick={rememberReturn}
                        className="inline-flex min-h-11 items-center rounded-[10px] bg-fal-navy px-3 text-sm font-bold text-white no-underline"
                      >
                        Abrir pedido
                      </Link>
                    )}
                    <OrderRowActionsMenu
                      orderId={o.id}
                      onOpenFull={onSelectOrder ? undefined : () => openFull(o.id)}
                    />
                  </div>
                </article>
              )
            })}
          </div>

          <div className="hidden md:block">
            <table className="min-w-full text-left text-sm">
              <thead className="sticky top-0 z-10 border-b border-fal-line bg-fal-surface text-xs uppercase text-fal-muted shadow-sm">
                <tr>
                  <th className="px-3 py-2">Pedido</th>
                  <th className="px-3 py-2">Cliente</th>
                  <th className="px-3 py-2">Faça agora</th>
                  <th className="px-3 py-2">Situação</th>
                  <th className="px-3 py-2">Frete / prazo</th>
                  {showWaitingTime ? <th className="px-3 py-2">Tempo aguardando</th> : null}
                  {showItemPreview ? <th className="px-3 py-2">Produtos</th> : null}
                  {showItemCount ? <th className="px-3 py-2">Itens</th> : null}
                  <th className="px-3 py-2">Pagamento</th>
                  <th className="px-3 py-2">Total</th>
                  <th className="px-3 py-2">Ações</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((o) => {
                  const selected = selectedOrderId === o.id
                  return (
                    <tr
                      key={o.id}
                      className={[
                        'border-b border-fal-line last:border-0',
                        selected ? 'bg-fal-accent/10' : 'hover:bg-fal-bg/60',
                        onSelectOrder ? 'cursor-pointer' : '',
                      ].join(' ')}
                      onClick={() => onSelectOrder?.(o.id)}
                    >
                      <td className="px-3 py-2">
                        <span className="font-mono text-xs">{o.id.slice(0, 8)}…</span>
                        <span className="mt-0.5 block text-[11px] text-fal-muted">
                          {formatDateTime(o.createdAt)}
                        </span>
                      </td>
                      <td className="px-3 py-2">{o.customerName ?? '—'}</td>
                      <td className="px-3 py-2">
                        <span className="inline-block rounded-[8px] border border-fal-yellow-dark/40 bg-fal-yellow/20 px-2 py-1 text-xs font-extrabold text-fal-navy">
                          {nextActionLabel(o)}
                        </span>
                      </td>
                      <td className="px-3 py-2">
                        <span className={badgeClass(toneForOrderStatus(o.status))}>
                          {listStatusLabel(o)}
                        </span>
                      </td>
                      <td className="px-3 py-2">
                        {o.shippingChoiceLabel ? (
                          <span className="inline-block rounded-md border border-green-300 bg-green-50 px-2 py-0.5 text-[11px] font-bold text-green-950">
                            {o.shippingChoiceLabel}
                          </span>
                        ) : (
                          <span className="text-xs text-fal-muted">—</span>
                        )}
                      </td>
                      {showWaitingTime ? (
                        <td className="px-3 py-2 text-xs">{waitingPaymentHours(o.createdAt)}</td>
                      ) : null}
                      {showItemPreview ? (
                        <td className="max-w-[220px] px-3 py-2 text-xs text-fal-muted">
                          {itemPreviewByOrderId?.[o.id] ?? `${o.itemCount} item(ns)`}
                        </td>
                      ) : null}
                      {showItemCount ? (
                        <td className="px-3 py-2">{o.itemCount}</td>
                      ) : null}
                      <td className="px-3 py-2">
                        <span className={badgeClass(toneForPaymentStatus(o.paymentStatus))}>
                          {paymentLabel(o)}
                        </span>
                      </td>
                      <td className="px-3 py-2 font-semibold">{formatMoney(o.total)}</td>
                      <td className="px-3 py-2" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center gap-2">
                          {onSelectOrder ? (
                            <button
                              type="button"
                              className="text-sm font-semibold text-fal-accent underline"
                              onClick={() => onSelectOrder(o.id)}
                            >
                              Abrir
                            </button>
                          ) : (
                            <Link
                              to={`/admin/pedidos/${o.id}`}
                              onClick={rememberReturn}
                              className="text-sm font-semibold text-fal-fg underline"
                            >
                              Abrir
                            </Link>
                          )}
                          <OrderRowActionsMenu
                            orderId={o.id}
                            onOpenFull={onSelectOrder ? undefined : () => openFull(o.id)}
                          />
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}
    </div>
  )
}

function matchesCustomerDoc(doc: string | null | undefined, q: string): boolean {
  if (!doc) return false
  const lower = doc.toLowerCase()
  if (lower.includes(q)) return true
  const docDigits = doc.replace(/\D/g, '')
  const qDigits = q.replace(/\D/g, '')
  return qDigits.length >= 3 && docDigits.includes(qDigits)
}

function matchesOrderTotal(total: number, q: string): boolean {
  const plain = q.replace(/r\$\s?/gi, '').trim()
  if (!plain) return false
  if (formatMoneyInput(total).toLowerCase().includes(plain)) return true
  if (formatMoney(total).toLowerCase().includes(q)) return true
  const parsed = parseMoneyBr(plain)
  if (parsed == null) return false
  return Math.round(parsed * 100) === Math.round(total * 100)
}

export function filterOrdersBySearch(rows: AdminOrderListRow[], raw: string): AdminOrderListRow[] {
  const q = raw.trim().toLowerCase()
  if (!q) return rows
  return rows.filter(
    (o) =>
      o.id.toLowerCase().includes(q) ||
      (o.customerName?.toLowerCase().includes(q) ?? false) ||
      matchesCustomerDoc(o.customerDoc, q) ||
      (o.itemSearchText?.includes(q) ?? false) ||
      matchesOrderTotal(o.total, q) ||
      (o.paymentStatus?.toLowerCase().includes(q) ?? false) ||
      (o.shippingChoiceLabel?.toLowerCase().includes(q) ?? false) ||
      listStatusLabel(o).toLowerCase().includes(q) ||
      nextActionLabel(o).toLowerCase().includes(q),
  )
}
