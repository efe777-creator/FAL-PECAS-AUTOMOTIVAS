import { Button } from '@/components/common/Button'
import { Loading } from '@/components/common/Loading'
import { useToast } from '@/components/common/Toast'
import { adminNextActionLabel, orderStatusOperatorLabel } from '@/lib/adminOrderOps'
import { formatDateTime } from '@/lib/datetime'
import { formatMoney } from '@/lib/money'
import { toUserMessage } from '@/lib/toUserMessage'
import {
  adminGetOrderDetail,
  type AdminOrderDetail,
  type AdminOrderListRow,
} from '@/services/admin/adminOrderService'
import { useEffect, useState, type ReactNode } from 'react'

export type OrderPreviewPanelProps = {
  orderId: string
  listRow?: AdminOrderListRow | null
  onClose: () => void
  onOpenFull: () => void
  chrome?: ReactNode
}

/**
 * Preview somente-leitura. Sem mutations (ship/cancel/packing/ME).
 */
export function OrderPreviewPanel({
  orderId,
  listRow,
  onClose,
  onOpenFull,
  chrome,
}: OrderPreviewPanelProps) {
  const toast = useToast()
  const [detail, setDetail] = useState<AdminOrderDetail | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setDetail(null)
    void adminGetOrderDetail(orderId)
      .then((d) => {
        if (cancelled) return
        setDetail(d)
        if (!d) toast.push('Pedido não encontrado', 'error')
      })
      .catch((e) => {
        if (cancelled) return
        toast.push(toUserMessage(e, 'Falha ao carregar pedido'), 'error')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
    // toast estável via host; intencional omitir das deps
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderId])

  const statusFromRow = listRow
    ? listRow.pickup && listRow.status === 'entregue'
      ? 'Retirada feita'
      : orderStatusOperatorLabel[listRow.status] ?? listRow.status
    : null
  const statusLabel =
    statusFromRow ??
    (detail ? (orderStatusOperatorLabel[detail.status] ?? detail.status) : '…')
  const next =
    listRow != null
      ? (listRow.logisticsNextActionLabel ??
        adminNextActionLabel(listRow.status, listRow.customerDecision))
      : null
  const customerName = detail?.customerName ?? listRow?.customerName ?? 'Cliente'
  const total = detail?.total ?? listRow?.total ?? 0
  const payment =
    detail?.payment?.status ??
    listRow?.paymentStatus ??
    '—'
  const freight =
    listRow?.shippingChoiceLabel ??
    (detail?.shipment
      ? [detail.shipment.carrier, detail.shipment.service].filter(Boolean).join(' · ')
      : null)

  const separated = detail?.items.filter((i) => i.separated).length ?? 0
  const separable =
    detail?.items.filter((i) => i.availability !== 'indisponivel').length ?? 0

  return (
    <div className="space-y-4">
      {chrome}
      <div className="flex flex-wrap items-center gap-2">
        <span className="rounded-[8px] bg-fal-navy px-2.5 py-1 text-xs font-extrabold text-white">
          {statusLabel}
        </span>
        <span className="font-mono text-xs text-fal-muted">{orderId.slice(0, 8)}…</span>
      </div>

      {next ? (
        <div className="rounded-[10px] border border-fal-yellow-dark/40 bg-fal-yellow/15 px-3 py-2">
          <p className="m-0 text-[10px] font-bold uppercase tracking-wide text-fal-fg/70">
            Faça agora
          </p>
          <p className="mb-0 mt-0.5 text-sm font-extrabold text-fal-fg">{next}</p>
        </div>
      ) : null}

      <section>
        <h3 className="m-0 text-xs font-bold uppercase tracking-wide text-fal-muted">Cliente</h3>
        <p className="mb-0 mt-1 text-sm font-extrabold text-fal-fg">{customerName}</p>
        {detail?.customerEmail ? (
          <p className="mb-0 mt-0.5 text-xs text-fal-muted">{detail.customerEmail}</p>
        ) : null}
      </section>

      <section>
        <h3 className="m-0 text-xs font-bold uppercase tracking-wide text-fal-muted">Produtos</h3>
        {loading && !detail ? (
          <Loading label="Carregando itens…" />
        ) : detail ? (
          <ul className="mt-2 space-y-2">
            {detail.items.slice(0, 8).map((it) => (
              <li key={it.id} className="flex justify-between gap-2 text-sm">
                <span className="min-w-0 truncate text-fal-fg">
                  {it.nameSnapshot}{' '}
                  <span className="text-fal-muted">×{it.quantity}</span>
                </span>
                <span className="shrink-0 font-semibold">{formatMoney(it.unitPrice)}</span>
              </li>
            ))}
            {detail.items.length > 8 ? (
              <li className="text-xs text-fal-muted">+{detail.items.length - 8} itens</li>
            ) : null}
          </ul>
        ) : (
          <p className="mt-1 text-sm text-fal-muted">
            {listRow ? `${listRow.itemCount} item(ns)` : '—'}
          </p>
        )}
      </section>

      <section className="grid gap-3 sm:grid-cols-2">
        <div>
          <h3 className="m-0 text-xs font-bold uppercase tracking-wide text-fal-muted">
            Pagamento
          </h3>
          <p className="mb-0 mt-1 text-sm font-semibold text-fal-fg">{payment}</p>
          {detail?.payment?.method ? (
            <p className="mb-0 text-xs text-fal-muted">{detail.payment.method}</p>
          ) : null}
        </div>
        <div>
          <h3 className="m-0 text-xs font-bold uppercase tracking-wide text-fal-muted">Total</h3>
          <p className="mb-0 mt-1 text-sm font-extrabold text-fal-fg">{formatMoney(total)}</p>
        </div>
      </section>

      {detail && separable > 0 ? (
        <section>
          <h3 className="m-0 text-xs font-bold uppercase tracking-wide text-fal-muted">
            Separação
          </h3>
          <p className="mb-1 mt-1 text-xs text-fal-muted">
            {separated}/{separable} itens (somente leitura)
          </p>
          <div className="h-2 overflow-hidden rounded-full bg-fal-bg">
            <div
              className="h-full rounded-full bg-fal-accent"
              style={{ width: `${Math.round((separated / separable) * 100)}%` }}
            />
          </div>
        </section>
      ) : null}

      <section>
        <h3 className="m-0 text-xs font-bold uppercase tracking-wide text-fal-muted">Entrega</h3>
        <p className="mb-0 mt-1 text-sm text-fal-fg">{freight || '—'}</p>
        {listRow?.createdAt || detail?.createdAt ? (
          <p className="mb-0 mt-0.5 text-xs text-fal-muted">
            Criado {formatDateTime(detail?.createdAt ?? listRow!.createdAt)}
          </p>
        ) : null}
      </section>

      <div className="flex flex-col gap-2 border-t border-fal-line pt-3">
        <Button type="button" variant="dark" fullWidth onClick={onOpenFull}>
          Ver página completa do pedido
        </Button>
        <Button type="button" variant="light" fullWidth onClick={onClose}>
          Fechar
        </Button>
      </div>
    </div>
  )
}
