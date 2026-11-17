import {
  badgeClass,
  toneForOrderStatus,
  toneForPaymentStatus,
} from '@/components/admin/orders/orderStatusTone'
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
  /** Quando o status já está no PanelChrome do AdaptiveWorkspace. */
  hideStatusChip?: boolean
}

type PreviewTab = 'resumo' | 'produtos' | 'pagamento' | 'historico'

const TABS: { id: PreviewTab; label: string }[] = [
  { id: 'resumo', label: 'Resumo' },
  { id: 'produtos', label: 'Produtos' },
  { id: 'pagamento', label: 'Pagamento' },
  { id: 'historico', label: 'Histórico' },
]

/**
 * Preview somente-leitura. Sem mutations (ship/cancel/packing/ME).
 */
export function OrderPreviewPanel({
  orderId,
  listRow,
  onClose,
  onOpenFull,
  chrome,
  hideStatusChip = false,
}: OrderPreviewPanelProps) {
  const toast = useToast()
  const [detail, setDetail] = useState<AdminOrderDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<PreviewTab>('resumo')

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setDetail(null)
    setTab('resumo')
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderId])

  const statusKey = listRow?.status ?? detail?.status ?? ''
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
  const paymentStatus =
    detail?.payment?.status ?? listRow?.paymentStatus ?? null
  const freight =
    listRow?.shippingChoiceLabel ??
    (detail?.shipment
      ? [detail.shipment.carrier, detail.shipment.service].filter(Boolean).join(' · ')
      : null)

  const separated = detail?.items.filter((i) => i.separated).length ?? 0
  const separable =
    detail?.items.filter((i) => i.availability !== 'indisponivel').length ?? 0

  return (
    <div className="flex h-full min-h-0 flex-col gap-3">
      {chrome}
      {!hideStatusChip ? (
        <div className="flex flex-wrap items-center gap-2">
          <span className={badgeClass(toneForOrderStatus(statusKey))}>{statusLabel}</span>
          <span className="font-mono text-xs text-fal-muted">#{orderId.slice(0, 8)}</span>
        </div>
      ) : null}

      <div
        className="flex flex-wrap gap-1 rounded-[10px] border border-fal-line bg-fal-bg p-1"
        role="tablist"
        aria-label="Seções do pedido"
      >
        {TABS.map((t) => {
          const active = tab === t.id
          return (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={active}
              className={[
                'min-h-9 flex-1 rounded-[8px] px-2 text-xs font-bold transition',
                active ? 'bg-fal-surface text-fal-fg shadow-sm' : 'text-fal-muted hover:text-fal-fg',
              ].join(' ')}
              onClick={() => setTab(t.id)}
            >
              {t.label}
            </button>
          )
        })}
      </div>

      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto" role="tabpanel">
        {tab === 'resumo' ? (
          <>
            {next ? (
              <div className="rounded-[10px] border border-fal-yellow-dark/40 bg-fal-yellow/15 px-3 py-2">
                <p className="m-0 text-[10px] font-bold uppercase tracking-wide text-fal-fg/70">
                  Faça agora
                </p>
                <p className="mb-0 mt-0.5 text-sm font-extrabold text-fal-fg">{next}</p>
              </div>
            ) : null}

            <section>
              <h3 className="m-0 text-xs font-bold uppercase tracking-wide text-fal-muted">
                Cliente
              </h3>
              <p className="mb-0 mt-1 text-sm font-extrabold text-fal-fg">{customerName}</p>
              {detail?.customerEmail ? (
                <p className="mb-0 mt-0.5 text-xs text-fal-muted">{detail.customerEmail}</p>
              ) : null}
              {detail?.customerDoc ? (
                <p className="mb-0 mt-0.5 text-xs text-fal-muted">Doc. {detail.customerDoc}</p>
              ) : null}
            </section>

            <section>
              <h3 className="m-0 text-xs font-bold uppercase tracking-wide text-fal-muted">
                Produtos
              </h3>
              {loading && !detail ? (
                <Loading label="Carregando…" />
              ) : (
                <p className="mb-0 mt-1 text-sm text-fal-fg">
                  {detail
                    ? `${detail.items.length} item(ns) · ${formatMoney(total)}`
                    : listRow
                      ? `${listRow.itemCount} item(ns) · ${formatMoney(total)}`
                      : '—'}
                </p>
              )}
            </section>

            {detail && separable > 0 ? (
              <section>
                <h3 className="m-0 text-xs font-bold uppercase tracking-wide text-fal-muted">
                  Separação
                </h3>
                <p className="mb-1 mt-1 text-xs text-fal-muted">
                  {separated}/{separable} (somente leitura)
                </p>
                <div className="h-2 overflow-hidden rounded-full bg-fal-bg">
                  <div
                    className="h-full rounded-full bg-fal-accent"
                    style={{ width: `${Math.round((separated / Math.max(separable, 1)) * 100)}%` }}
                  />
                </div>
              </section>
            ) : null}

            <section>
              <h3 className="m-0 text-xs font-bold uppercase tracking-wide text-fal-muted">
                Entrega
              </h3>
              <p className="mb-0 mt-1 text-sm text-fal-fg">{freight || '—'}</p>
              {(listRow?.createdAt || detail?.createdAt) && (
                <p className="mb-0 mt-0.5 text-xs text-fal-muted">
                  Criado {formatDateTime(detail?.createdAt ?? listRow!.createdAt)}
                </p>
              )}
            </section>
          </>
        ) : null}

        {tab === 'produtos' ? (
          <section>
            {loading && !detail ? (
              <Loading label="Carregando itens…" />
            ) : detail ? (
              <ul className="space-y-2">
                {detail.items.map((it) => {
                  const lineTotal = it.unitPrice * it.quantity
                  return (
                    <li
                      key={it.id}
                      className="flex items-start gap-2.5 rounded-[10px] border border-fal-line bg-fal-bg/40 px-2.5 py-2 text-sm"
                    >
                      <div className="h-12 w-12 shrink-0 overflow-hidden rounded-md border border-fal-line bg-fal-surface">
                        {it.imageUrl ? (
                          <img
                            src={it.imageUrl}
                            alt=""
                            className="h-full w-full object-cover"
                            loading="lazy"
                          />
                        ) : (
                          <div
                            className="flex h-full w-full items-center justify-center text-[10px] font-bold text-fal-muted"
                            aria-hidden
                          >
                            —
                          </div>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="m-0 truncate font-semibold text-fal-fg">{it.nameSnapshot}</p>
                        <p className="mb-0 mt-0.5 text-xs text-fal-muted">{it.sku}</p>
                        <p className="mb-0 mt-1 text-xs text-fal-fg">
                          Qtd. <span className="font-bold">{it.quantity}</span>
                          <span className="text-fal-muted"> · </span>
                          {formatMoney(it.unitPrice)} un.
                        </p>
                      </div>
                      <div className="shrink-0 text-right">
                        <p className="m-0 text-sm font-extrabold text-fal-fg">
                          {formatMoney(lineTotal)}
                        </p>
                        <p className="mb-0 mt-0.5 text-[10px] text-fal-muted">subtotal</p>
                      </div>
                    </li>
                  )
                })}
              </ul>
            ) : (
              <p className="text-sm text-fal-muted">
                {listRow ? `${listRow.itemCount} item(ns)` : '—'}
              </p>
            )}
          </section>
        ) : null}

        {tab === 'pagamento' ? (
          <section className="space-y-3">
            <div>
              <h3 className="m-0 text-xs font-bold uppercase tracking-wide text-fal-muted">
                Status
              </h3>
              <p className="mb-0 mt-1">
                <span className={badgeClass(toneForPaymentStatus(paymentStatus))}>
                  {paymentStatus ?? '—'}
                </span>
              </p>
            </div>
            {detail?.payment?.method ? (
              <div>
                <h3 className="m-0 text-xs font-bold uppercase tracking-wide text-fal-muted">
                  Método
                </h3>
                <p className="mb-0 mt-1 text-sm font-semibold text-fal-fg">
                  {detail.payment.method}
                </p>
              </div>
            ) : null}
            <div>
              <h3 className="m-0 text-xs font-bold uppercase tracking-wide text-fal-muted">
                Total
              </h3>
              <p className="mb-0 mt-1 text-lg font-extrabold text-fal-fg">{formatMoney(total)}</p>
            </div>
            {detail?.payment?.externalRef ? (
              <p className="text-xs text-fal-muted">Ref. {detail.payment.externalRef}</p>
            ) : null}
          </section>
        ) : null}

        {tab === 'historico' ? (
          <section>
            {loading && !detail ? (
              <Loading label="Carregando histórico…" />
            ) : detail?.events?.length ? (
              <ul className="space-y-2">
                {detail.events.slice(0, 20).map((ev) => (
                  <li
                    key={ev.id}
                    className="rounded-[10px] border border-fal-line px-3 py-2 text-sm"
                  >
                    <p className="m-0 font-semibold text-fal-fg">{ev.eventType}</p>
                    <p className="mb-0 mt-0.5 text-xs text-fal-muted">
                      {formatDateTime(ev.createdAt)} · {ev.visibility}
                    </p>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-fal-muted">Sem eventos para exibir.</p>
            )}
          </section>
        ) : null}
      </div>

      <div className="flex flex-col gap-2 border-t border-fal-line pt-3">
        <Button type="button" variant="dark" fullWidth onClick={onOpenFull}>
          Ver página completa do pedido →
        </Button>
        <Button type="button" variant="light" fullWidth onClick={onClose}>
          Fechar
        </Button>
      </div>
    </div>
  )
}
