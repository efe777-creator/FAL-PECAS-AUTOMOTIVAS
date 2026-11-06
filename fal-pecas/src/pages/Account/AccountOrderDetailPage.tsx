import { Button } from '@/components/common/Button'
import { confirmDialog } from '@/components/common/ConfirmDialog'
import { EmptyState } from '@/components/common/EmptyState'
import { ErrorState } from '@/components/common/ErrorState'
import { Loading } from '@/components/common/Loading'
import { ResumeOrderPaymentPanel } from '@/components/payments/ResumeOrderPaymentPanel'
import { useCart } from '@/contexts/CartContext'
import { formatDateTime } from '@/lib/datetime'
import { formatMoney } from '@/lib/money'
import {
  buildOrderWhatsAppMessage,
  storeWhatsAppPhone,
  whatsAppHref,
} from '@/lib/whatsapp'
import {
  orderEventLabel,
  orderStatusLabel,
  projectCustomerTimeline,
} from '@/lib/orderLifecycle'
import { buildBuyAgainCart } from '@/services/orders/buyAgainService'
import {
  customerCancelUnpaidOrder,
  customerRespondOrderDecision,
  requestOrderCancellation,
} from '@/services/orders/customerOrderActions'
import { getMyOrderDetail } from '@/services/orders/orderDetailService'
import type { OrderDetail } from '@/types'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'

function availabilityLabel(a: string | null | undefined): string {
  switch (a) {
    case 'disponivel':
      return 'Disponível'
    case 'disponivel_com_prazo':
      return 'Disponível com prazo'
    case 'indisponivel':
      return 'Indisponível'
    default:
      return '—'
  }
}

function money(v: number) {
  return formatMoney(v)
}

export function AccountOrderDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { addItem } = useCart()
  const [order, setOrder] = useState<OrderDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [rebuyBusy, setRebuyBusy] = useState(false)
  const [rebuyMsg, setRebuyMsg] = useState<string | null>(null)
  const [actionBusy, setActionBusy] = useState(false)
  const [actionMsg, setActionMsg] = useState<string | null>(null)

  const reload = useCallback(async () => {
    if (!id) return
    setLoading(true)
    try {
      setOrder(await getMyOrderDetail(id))
      setError(null)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao carregar pedido')
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => {
    void reload()
  }, [reload])

  const timeline = useMemo(
    () => (order ? projectCustomerTimeline(order.status) : []),
    [order],
  )

  const awaitingPayment = order?.status === 'aguardando_pagamento'
  const awaitingDecision = order?.status === 'aguardando_decisao'
  const decisionPending =
    awaitingDecision &&
    (order?.customerDecision == null || order.customerDecision === 'pending')
  const canRequestCancel =
    !!order &&
    order.payment?.status === 'approved' &&
    !['aguardando_pagamento', 'cancelado', 'enviado', 'entregue'].includes(order.status) &&
    order.cancellationRequest !== 'pending' &&
    order.cancellationRequest !== 'approved'
  const cancelRequestPending = order?.cancellationRequest === 'pending'

  async function restoreItemsToCart(detail: OrderDetail) {
    const result = await buildBuyAgainCart(detail.items)
    for (const row of result.products) {
      addItem(row.product, row.quantity)
    }
    return result
  }

  async function onCancelUnpaid() {
    if (!order) return
    const { confirmed } = await confirmDialog({
      title: 'Cancelar pedido?',
      message:
        'Os itens voltarão ao carrinho (preços atuais) e a reserva será liberada.',
      confirmLabel: 'Cancelar pedido',
      danger: true,
    })
    if (!confirmed) return
    setActionBusy(true)
    setActionMsg(null)
    try {
      await customerCancelUnpaidOrder(order.id)
      const result = await restoreItemsToCart(order)
      const parts = ['Pedido cancelado.']
      if (result.products.length) {
        parts.push(`${result.products.length} item(ns) no carrinho.`)
      }
      if (result.skipped.length) {
        parts.push(
          `Não restaurados: ${result.skipped.map((s) => `${s.sku} (${s.reason})`).join('; ')}`,
        )
      }
      setActionMsg(parts.join(' '))
      await reload()
      if (result.products.length) navigate('/carrinho')
    } catch (e) {
      setActionMsg(e instanceof Error ? e.message : 'Falha ao cancelar')
    } finally {
      setActionBusy(false)
    }
  }

  async function onRespondDecision(decision: 'authorize' | 'reject') {
    if (!order) return
    const { confirmed } =
      decision === 'authorize'
        ? await confirmDialog({
            title: 'Autorizar alterações?',
            message:
              'Autorizar as alterações da loja (itens indisponíveis ou com prazo)? Depois a loja poderá confirmar o pedido.',
            confirmLabel: 'Autorizar',
          })
        : await confirmDialog({
            title: 'Recusar alterações?',
            message:
              'A loja será avisada e precisará cancelar ou renegociar.',
            confirmLabel: 'Recusar',
            danger: true,
          })
    if (!confirmed) return
    setActionBusy(true)
    setActionMsg(null)
    try {
      await customerRespondOrderDecision(order.id, decision)
      setActionMsg(
        decision === 'authorize'
          ? 'Autorização registrada. A loja poderá confirmar o pedido.'
          : 'Recusa registrada. A loja analisará o pedido.',
      )
      await reload()
    } catch (e) {
      setActionMsg(e instanceof Error ? e.message : 'Falha ao registrar decisão')
    } finally {
      setActionBusy(false)
    }
  }

  async function onRequestCancellation() {
    if (!order) return
    const { confirmed, reason } = await confirmDialog({
      title: 'Solicitar cancelamento?',
      message:
        'A loja analisará. Se aprovado, o estorno é feito pela FAL (manual).',
      confirmLabel: 'Solicitar',
      danger: true,
      askReason: true,
      reasonLabel: 'Motivo (opcional)',
    })
    if (!confirmed) return
    setActionBusy(true)
    setActionMsg(null)
    try {
      await requestOrderCancellation(order.id, reason ?? '')
      setActionMsg(
        'Solicitação enviada. Aguarde a análise da loja. O pedido segue no status atual até a resposta.',
      )
      await reload()
    } catch (e) {
      setActionMsg(e instanceof Error ? e.message : 'Falha ao solicitar cancelamento')
    } finally {
      setActionBusy(false)
    }
  }

  async function onBuyAgain() {
    if (!order) return
    setRebuyBusy(true)
    setRebuyMsg(null)
    try {
      const result = await buildBuyAgainCart(order.items)
      for (const row of result.products) {
        addItem(row.product, row.quantity)
      }
      const parts: string[] = []
      if (result.products.length) {
        parts.push(`${result.products.length} item(ns) adicionados ao carrinho com preços atuais.`)
      }
      if (result.skipped.length) {
        parts.push(
          `Não incluídos: ${result.skipped.map((s) => `${s.sku} (${s.reason})`).join('; ')}`,
        )
      }
      if (!result.products.length) {
        setRebuyMsg(parts.join(' ') || 'Nenhum item disponível para recompra.')
        return
      }
      setRebuyMsg(parts.join(' '))
      navigate('/carrinho')
    } catch (e) {
      setRebuyMsg(e instanceof Error ? e.message : 'Falha ao montar recompra')
    } finally {
      setRebuyBusy(false)
    }
  }

  if (loading) return <Loading label="Carregando pedido…" />
  if (error) return <ErrorState message={error} />
  if (!order) {
    return (
      <EmptyState
        title="Pedido não encontrado"
        description="Verifique o link ou volte à lista de pedidos."
        actionLabel="Meus pedidos"
        actionTo="/conta/pedidos"
      />
    )
  }

  const addr = order.addressSnapshot
  const updates =
    order.events.length > 0
      ? order.events
      : order.history.map((h) => ({
          id: h.id,
          eventType: 'status_changed',
          payload: { note: h.note, status: h.status },
          visibility: 'customer' as const,
          createdAt: h.createdAt,
        }))

  return (
    <div className="space-y-4">
      <div className="rounded-fal border border-fal-line bg-white p-5">
        <p className="m-0 text-sm">
          <Link to="/conta/pedidos" className="font-semibold text-fal-auth-link">
            ← Pedidos
          </Link>
        </p>
        <div className="mt-2 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="mt-0 text-xl font-extrabold">Pedido {order.id.slice(0, 8)}…</h2>
            <p className="mb-0 text-sm text-fal-muted">
              {formatDateTime(order.createdAt)} ·{' '}
              <strong>{orderStatusLabel[order.status] ?? order.status}</strong>
            </p>
            {awaitingPayment ? (
              <p className="mb-0 mt-2 inline-block rounded-md bg-amber-100 px-2 py-1 text-xs font-bold text-amber-900">
                Pendente de pagamento — continue abaixo ou cancele para editar no carrinho
              </p>
            ) : null}
            {awaitingDecision ? (
              <p className="mb-0 mt-2 inline-block rounded-md bg-sky-100 px-2 py-1 text-xs font-bold text-sky-900">
                A loja pediu sua autorização — veja o painel abaixo
              </p>
            ) : null}
            {cancelRequestPending ? (
              <p className="mb-0 mt-2 inline-block rounded-md bg-amber-100 px-2 py-1 text-xs font-bold text-amber-900">
                Cancelamento solicitado — aguardando análise da loja
              </p>
            ) : null}
          </div>
          <div className="flex flex-wrap gap-2">
            {awaitingPayment ? (
              <Button
                type="button"
                variant="light"
                disabled={actionBusy}
                onClick={() => void onCancelUnpaid()}
              >
                {actionBusy ? 'Cancelando…' : 'Cancelar pedido'}
              </Button>
            ) : null}
            {canRequestCancel ? (
              <Button
                type="button"
                variant="outline"
                disabled={actionBusy}
                onClick={() => void onRequestCancellation()}
              >
                Solicitar cancelamento
              </Button>
            ) : null}
            <Button type="button" variant="light" disabled={rebuyBusy} onClick={() => void onBuyAgain()}>
              {rebuyBusy ? 'Preparando…' : 'Comprar novamente'}
            </Button>
            {(() => {
              const phone = storeWhatsAppPhone()
              if (!phone) return null
              const href = whatsAppHref(
                phone,
                buildOrderWhatsAppMessage({
                  orderNumber: order.id.slice(0, 8),
                  statusLabel: orderStatusLabel[order.status] ?? order.status,
                }),
              )
              return (
                <a
                  href={href}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center rounded-[10px] border border-[#25D366] bg-[#25D366]/10 px-3 py-2 text-sm font-bold text-[#128C7E]"
                >
                  Falar sobre este pedido
                </a>
              )
            })()}
          </div>
        </div>
        {rebuyMsg ? <p className="mb-0 mt-2 text-sm text-fal-muted">{rebuyMsg}</p> : null}
        {actionMsg ? <p className="mb-0 mt-2 text-sm text-fal-muted">{actionMsg}</p> : null}
      </div>

      {awaitingPayment ? (
        <div className="rounded-fal border border-amber-300 bg-amber-50/60 p-5">
          <h3 className="mt-0 text-base font-extrabold text-fal-navy">Continuar pagamento</h3>
          <p className="mt-1 text-sm text-fal-muted">
            Pedido reservado. O Pix vale 5 minutos — se expirar, gere um novo QR ou pague no
            cartão (o pedido permanece até 48 h). Sem pagamento aprovado em 48 h, o pedido é
            cancelado e sai da fila. Após a aprovação, esta tela atualiza sozinha. Para alterar
            itens, cancele o pedido (os itens voltam ao carrinho).
          </p>
          <div className="mt-4">
            <ResumeOrderPaymentPanel order={order} onPaid={() => void reload()} />
          </div>
        </div>
      ) : null}

      {awaitingDecision ? (
        <div className="rounded-fal border border-sky-300 bg-sky-50/70 p-5">
          <h3 className="mt-0 text-base font-extrabold text-fal-navy">
            A loja pediu sua autorização
          </h3>
          <p className="mt-1 text-sm text-fal-muted">
            Um ou mais itens ficaram indisponíveis ou com prazo diferente. Nada é aplicado
            em silêncio — escolha autorizar ou recusar.
          </p>
          <ul className="mt-3 list-none space-y-2 p-0 text-sm">
            {order.items
              .filter(
                (i) =>
                  i.availability === 'indisponivel' || i.availability === 'disponivel_com_prazo',
              )
              .map((i) => (
                <li key={i.id} className="rounded-md border border-sky-200 bg-white px-3 py-2">
                  <strong>
                    {i.quantity}× {i.nameSnapshot}
                  </strong>
                  <span className="block text-xs text-fal-muted">
                    {availabilityLabel(i.availability)}
                    {i.leadDays != null ? ` · ${i.leadDays} dia(s)` : ''}
                    {i.staffNote ? ` — ${i.staffNote}` : ''}
                  </span>
                </li>
              ))}
          </ul>
          {decisionPending ? (
            <div className="mt-4 flex flex-wrap gap-2">
              <Button
                type="button"
                disabled={actionBusy}
                onClick={() => void onRespondDecision('authorize')}
              >
                Autorizar
              </Button>
              <Button
                type="button"
                variant="light"
                disabled={actionBusy}
                onClick={() => void onRespondDecision('reject')}
              >
                Recusar
              </Button>
            </div>
          ) : (
            <p className="mb-0 mt-3 text-sm font-semibold text-fal-navy">
              {order.customerDecision === 'authorized'
                ? 'Você já autorizou. Aguardando a loja confirmar o pedido.'
                : order.customerDecision === 'rejected'
                  ? 'Você recusou. A loja analisará o pedido.'
                  : null}
            </p>
          )}
        </div>
      ) : null}

      <div className="rounded-fal border border-fal-line bg-white p-5">
        <h3 className="mt-0 text-base font-extrabold">Andamento</h3>
        <ol className="m-0 list-none space-y-2 p-0">
          {timeline.map((step) => (
            <li key={step.id} className="flex items-center gap-2 text-sm">
              <span
                className={
                  step.state === 'done'
                    ? 'font-extrabold text-fal-success'
                    : step.state === 'current'
                      ? 'font-extrabold text-fal-navy'
                      : 'text-fal-muted'
                }
              >
                {step.state === 'done' ? '✓' : step.state === 'current' ? '●' : '○'}
              </span>
              <span
                className={
                  step.state === 'todo' ? 'text-fal-muted' : 'font-semibold text-fal-ink'
                }
              >
                {step.label}
              </span>
            </li>
          ))}
        </ol>
      </div>

      <div className="rounded-fal border border-fal-line bg-white p-5">
        <h3 className="mt-0 text-base font-extrabold">Itens</h3>
        <ul className="m-0 list-none space-y-2 p-0">
          {order.items.map((i) => (
            <li
              key={i.id}
              className="flex justify-between gap-3 border-b border-fal-line py-2 text-sm last:border-0"
            >
              <span>
                {i.quantity}× {i.nameSnapshot}
                <span className="block text-xs text-fal-muted">
                  SKU {i.sku}
                  {i.availability
                    ? ` · ${availabilityLabel(i.availability)}${
                        i.leadDays != null ? ` (${i.leadDays}d)` : ''
                      }`
                    : ''}
                </span>
              </span>
              <span className="font-semibold">{money(i.unitPrice * i.quantity)}</span>
            </li>
          ))}
        </ul>
        <div className="mt-3 space-y-1 text-sm">
          <div className="flex justify-between">
            <span>Subtotal</span>
            <span>{money(order.subtotal)}</span>
          </div>
          <div className="flex justify-between">
            <span>Frete</span>
            <span>{money(order.shippingAmount)}</span>
          </div>
          <div className="flex justify-between text-lg font-black">
            <span>Total</span>
            <span>{money(order.total)}</span>
          </div>
        </div>
      </div>

      {addr ? (
        <div className="rounded-fal border border-fal-line bg-white p-5 text-sm">
          <h3 className="mt-0 text-base font-extrabold">Endereço (snapshot)</h3>
          <p className="m-0">
            {String(addr.recipient ?? '')}
            <br />
            {String(addr.street ?? '')}, {String(addr.number ?? '')}
            {addr.complement ? ` — ${String(addr.complement)}` : ''}
            <br />
            {addr.district ? `${String(addr.district)} · ` : ''}
            {String(addr.city ?? '')}/{String(addr.state ?? '')} · CEP{' '}
            {String(addr.postal_code ?? '')}
          </p>
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="rounded-fal border border-fal-line bg-white p-5 text-sm">
          <h3 className="mt-0 text-base font-extrabold">Pagamento</h3>
          {order.payment ? (
            <p className="m-0">
              {order.payment.provider} · {order.payment.status}
              <br />
              {order.payment.amount != null ? money(order.payment.amount) : null}
              {order.payment.externalRef ? (
                <>
                  <br />
                  Ref: {order.payment.externalRef}
                </>
              ) : null}
            </p>
          ) : (
            <p className="m-0 text-fal-muted">Sem registro</p>
          )}
        </div>
        <div className="rounded-fal border border-fal-line bg-white p-5 text-sm">
          <h3 className="mt-0 text-base font-extrabold">Envio</h3>
          {order.shipment ? (
            <p className="m-0">
              {String(order.shipment.metadata?.label ?? order.shipment.provider)} ·{' '}
              {order.shipment.status}
              <br />
              {order.shipment.amount != null ? money(order.shipment.amount) : null}
              {order.shipment.trackingCode ? (
                <>
                  <br />
                  Rastreio: {order.shipment.trackingCode}
                </>
              ) : null}
            </p>
          ) : (
            <p className="m-0 text-fal-muted">Sem registro</p>
          )}
        </div>
      </div>

      <div className="rounded-fal border border-fal-line bg-white p-5">
        <h3 className="mt-0 text-base font-extrabold">Atualizações do pedido</h3>
        <ol className="m-0 list-none space-y-2 p-0">
          {updates.map((ev) => {
            const note =
              typeof ev.payload.note === 'string' && ev.payload.note
                ? ev.payload.note
                : null
            return (
              <li key={ev.id} className="border-l-2 border-fal-yellow pl-3 text-sm">
                <strong>{orderEventLabel[ev.eventType] ?? ev.eventType}</strong>
                <span className="block text-xs text-fal-muted">
                  {formatDateTime(ev.createdAt)}
                  {note ? ` — ${note}` : ''}
                </span>
              </li>
            )
          })}
        </ol>
      </div>
    </div>
  )
}
