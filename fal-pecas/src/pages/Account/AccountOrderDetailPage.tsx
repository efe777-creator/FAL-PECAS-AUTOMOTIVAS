import { Button } from '@/components/common/Button'
import { confirmDialog } from '@/components/common/ConfirmDialog'
import { EmptyState } from '@/components/common/EmptyState'
import { ErrorState } from '@/components/common/ErrorState'
import { Loading } from '@/components/common/Loading'
import { useToast } from '@/components/common/Toast'
import { ResumeOrderPaymentPanel } from '@/components/payments/ResumeOrderPaymentPanel'
import { useCart } from '@/contexts/CartContext'
import { formatDateTime } from '@/lib/datetime'
import { formatMoney } from '@/lib/money'
import { paymentProviderLabel, paymentStatusLabel } from '@/lib/paymentLabels'
import { shipmentStatusLabel } from '@/lib/shippingLabels'
import {
  buildOrderWhatsAppMessage,
  storeWhatsAppPhone,
  whatsAppHref,
} from '@/lib/whatsapp'
import {
  customerFacingOrderStatusLabel,
  orderEventLabel,
  projectCustomerTimeline,
} from '@/lib/orderLifecycle'
import { readContractedShipping } from '@/lib/contractedShipping'
import { isOrderStorePickup } from '@/lib/orderShippingKind'
import { isStorePickupAuthorized } from '@/lib/storePickupOps'
import { buildTrackingUrl } from '@/lib/shipmentTrackingUrl'
import { buildBuyAgainCart } from '@/services/orders/buyAgainService'
import {
  customerCancelUnpaidOrder,
  customerConfirmReceipt,
  customerReportDeliveryIssue,
  customerRespondOrderDecision,
  requestOrderCancellation,
} from '@/services/orders/customerOrderActions'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { toUserMessage } from '@/lib/toUserMessage'
import { getStoreShippingOrigin } from '@/services/admin/adminShippingOriginService'
import { getMyOrderDetail } from '@/services/orders/orderDetailService'
import { formatStoreOriginAddress } from '@/services/shipping/storePickupOption'
import type { OrderDetail, StoreShippingOrigin } from '@/types'
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
  const toast = useToast()
  const [order, setOrder] = useState<OrderDetail | null>(null)
  useDocumentTitle(
    order
      ? `Pedido #${order.id.slice(0, 8)} | FAL Peças Automotivas`
      : 'Pedido | FAL Peças Automotivas',
  )
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [rebuyBusy, setRebuyBusy] = useState(false)
  const [actionBusy, setActionBusy] = useState(false)
  const [storeOrigin, setStoreOrigin] = useState<StoreShippingOrigin | null>(null)

  /** Só toast — não usa `error` de carga (senão a página vira ErrorState). */
  function pushError(message: string) {
    toast.push(message, 'error')
  }

  function pushOk(message: string) {
    toast.push(message, 'success')
  }

  const reload = useCallback(async () => {
    if (!id) return
    setLoading(true)
    try {
      setOrder(await getMyOrderDetail(id))
      setError(null)
    } catch (e) {
      const message = toUserMessage(e, 'Erro ao carregar pedido')
      setError(message)
      toast.push(message, 'error')
    } finally {
      setLoading(false)
    }
  }, [id, toast])

  useEffect(() => {
    void reload()
  }, [reload])

  useEffect(() => {
    let active = true
    void getStoreShippingOrigin()
      .then((o) => {
        if (active) setStoreOrigin(o)
      })
      .catch(() => {
        if (active) setStoreOrigin(null)
      })
    return () => {
      active = false
    }
  }, [])

  const storePickup = order ? isOrderStorePickup(order) : false
  const pickupAuthorized = order
    ? isStorePickupAuthorized(order.shipment?.metadata ?? null)
    : false
  const pickupReady =
    storePickup &&
    pickupAuthorized &&
    !!order &&
    ['pronto_para_envio', 'preparando_envio', 'enviado'].includes(order.status)
  const timeline = useMemo(
    () =>
      order
        ? projectCustomerTimeline(order.status, {
            pickup: storePickup,
            pickupAuthorized,
          })
        : [],
    [order, storePickup, pickupAuthorized],
  )
  const statusLabel = order
    ? customerFacingOrderStatusLabel({
        status: order.status,
        pickup: storePickup,
        pickupAuthorized,
      })
    : ''

  const proposalKind = useMemo(() => {
    const fromCol = String(order?.decisionProposal?.kind ?? '').trim()
    if (fromCol) return fromCol
    if (!order?.events?.length) return ''
    const hit = [...order.events]
      .reverse()
      .find(
        (e) =>
          e.eventType === 'order_awaiting_decision' ||
          e.eventType === 'staff_requested_customer_decision',
      )
    return String(hit?.payload?.kind ?? hit?.payload?.reason_kind ?? '').trim()
  }, [order])

  const decisionRequestReason = useMemo(() => {
    const fromCol = String(order?.decisionProposal?.reason_text ?? '').trim()
    if (fromCol) {
      const kindLabel =
        proposalKind === 'prazo'
          ? 'Prazo'
          : proposalKind === 'parcial'
            ? 'Itens indisponíveis'
            : proposalKind === 'escolha'
              ? 'Decisão necessária'
              : proposalKind === 'obs'
                ? 'Observação'
                : proposalKind === 'indisponivel'
                  ? 'Indisponibilidade'
                  : proposalKind === 'outro'
                    ? 'Outro'
                    : null
      return kindLabel ? `${kindLabel}: ${fromCol}` : fromCol
    }
    if (!order?.events?.length) return null
    const hit = [...order.events]
      .reverse()
      .find(
        (e) =>
          e.eventType === 'order_awaiting_decision' ||
          e.eventType === 'staff_requested_customer_decision',
      )
    if (!hit) return null
    const kind = String(hit.payload?.kind ?? hit.payload?.reason_kind ?? '')
    const text = String(hit.payload?.reason_text ?? '').trim()
    const kindLabel =
      kind === 'prazo'
        ? 'Prazo'
        : kind === 'parcial'
          ? 'Itens indisponíveis'
          : kind === 'escolha'
            ? 'Decisão necessária'
            : kind === 'obs'
              ? 'Observação'
              : kind === 'indisponivel'
                ? 'Indisponibilidade'
                : kind === 'outro'
                  ? 'Outro'
                  : null
    if (kindLabel && text) return `${kindLabel}: ${text}`
    if (text) return text
    if (kindLabel) return kindLabel
    return null
  }, [order, proposalKind])

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
      pushOk(parts.join(' '))
      await reload()
      if (result.products.length) navigate('/carrinho')
    } catch (e) {
      pushError(toUserMessage(e, 'Falha ao cancelar'))
    } finally {
      setActionBusy(false)
    }
  }

  async function onRespondDecision(
    decision: 'continue_available' | 'wait_arrival' | 'cancel_order',
  ) {
    if (!order) return
    const { confirmed, reason } =
      decision === 'continue_available'
        ? await confirmDialog({
            title:
              proposalKind === 'prazo' ? 'Aceitar o novo prazo?' : 'Continuar com o disponível?',
            message:
              proposalKind === 'prazo'
                ? 'Você aceita o prazo informado pela loja. A equipe vai liberar o pedido para separação.'
                : 'Seguiremos só com os itens disponíveis (estorno do faltante é manual pela loja). A equipe libera a separação em seguida.',
            confirmLabel: proposalKind === 'prazo' ? 'Aceitar prazo' : 'Continuar',
          })
        : decision === 'wait_arrival'
          ? await confirmDialog({
              title: 'Esperar a chegada?',
              message:
                'O pedido fica aguardando disponibilidade. A loja retomará quando o item chegar.',
              confirmLabel: 'Esperar',
            })
          : await confirmDialog({
              title: 'Cancelar o pedido?',
              message:
                'Informe o motivo. A loja analisará o cancelamento do pedido inteiro (estorno manual).',
              confirmLabel: 'Cancelar pedido',
              danger: true,
              requireReason: true,
              reasonLabel: 'Motivo do cancelamento',
              reasonPlaceholder: 'Ex.: prefiro cancelar / prazo longo demais',
            })
    if (!confirmed) return
    setActionBusy(true)
    try {
      await customerRespondOrderDecision(order.id, decision, reason)
      pushOk(
        decision === 'continue_available'
          ? 'Confirmação recebida. A loja vai liberar o pedido para separação.'
          : decision === 'wait_arrival'
            ? 'Registrado. A loja aguardará a disponibilidade.'
            : 'Cancelamento solicitado. A loja analisará o pedido.',
      )
      await reload()
    } catch (e) {
      pushError(toUserMessage(e, 'Falha ao registrar decisão'))
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
    try {
      await requestOrderCancellation(order.id, reason ?? '')
      pushOk(
        'Solicitação enviada. Aguarde a análise da loja. O pedido segue no status atual até a resposta.',
      )
      await reload()
    } catch (e) {
      pushError(toUserMessage(e, 'Falha ao solicitar cancelamento'))
    } finally {
      setActionBusy(false)
    }
  }

  const receiptConfirmed = Boolean(
    order?.events?.some((e) => e.eventType === 'customer_receipt_confirmed'),
  )
  const canPostDelivery =
    order?.status === 'entregue' || order?.status === 'enviado'

  async function onConfirmReceipt() {
    if (!order) return
    const { confirmed } = await confirmDialog({
      title: 'Confirmar recebimento?',
      message: 'Confirma que recebeu o pedido em boas condições?',
      confirmLabel: 'Confirmar recebimento',
    })
    if (!confirmed) return
    setActionBusy(true)
    try {
      const r = await customerConfirmReceipt(order.id)
      pushOk(
        r.already
          ? 'Recebimento já estava confirmado.'
          : 'Recebimento confirmado. Obrigado!',
      )
      await reload()
    } catch (e) {
      pushError(toUserMessage(e, 'Falha ao confirmar recebimento'))
    } finally {
      setActionBusy(false)
    }
  }

  async function onReportDeliveryIssue() {
    if (!order) return
    const { confirmed, reason } = await confirmDialog({
      title: 'Reportar problema?',
      message: 'Descreva o que aconteceu. A loja será notificada.',
      confirmLabel: 'Enviar',
      danger: true,
      requireReason: true,
      reasonLabel: 'Descreva o problema',
      reasonPlaceholder: 'Ex.: embalagem danificada, item faltando…',
    })
    if (!confirmed || !reason?.trim()) return
    setActionBusy(true)
    try {
      await customerReportDeliveryIssue(order.id, reason)
      pushOk('Problema registrado. A loja vai analisar.')
      await reload()
    } catch (e) {
      pushError(toUserMessage(e, 'Falha ao reportar problema'))
    } finally {
      setActionBusy(false)
    }
  }

  async function onBuyAgain() {
    if (!order) return
    setRebuyBusy(true)
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
        pushError(parts.join(' ') || 'Nenhum item disponível para recompra.')
        return
      }
      pushOk(parts.join(' '))
      navigate('/carrinho')
    } catch (e) {
      pushError(toUserMessage(e, 'Falha ao montar recompra'))
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
  const contractedShip = readContractedShipping(order.shipment, order.shippingAmount)
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
              {formatDateTime(order.createdAt)} · <strong>{statusLabel}</strong>
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
            {pickupReady ? (
              <p className="mb-0 mt-2 inline-block rounded-md bg-emerald-100 px-2 py-1 text-xs font-bold text-emerald-900">
                Retirada autorizada — você já pode buscar na loja
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
                  statusLabel,
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
            <Link
              to="/trocas-devolucoes"
              className="inline-flex items-center rounded-[10px] border border-fal-line bg-white px-3 py-2 text-sm font-bold text-fal-navy hover:bg-fal-bg"
            >
              Trocas e devoluções
            </Link>
          </div>
        </div>
      </div>

      {pickupReady ? (
        <section className="rounded-fal border-2 border-emerald-400 bg-emerald-50/70 p-5">
          <p className="m-0 text-[11px] font-bold uppercase tracking-wide text-emerald-900/80">
            Faça agora
          </p>
          <h3 className="mt-1 mb-0 text-lg font-extrabold text-fal-navy">
            Pedido pronto para retirar na loja
          </h3>
          <p className="mt-2 mb-0 text-sm text-fal-ink">
            A loja liberou a retirada. Leve documento e o número do pedido{' '}
            <strong>{order.id.slice(0, 8)}…</strong>.
          </p>
          {storeOrigin ? (
            <p className="mt-3 mb-0 rounded-[10px] border border-emerald-200 bg-white px-3 py-2 text-sm text-fal-ink">
              <strong>Endereço:</strong> {formatStoreOriginAddress(storeOrigin)}
            </p>
          ) : (
            <p className="mt-3 mb-0 text-sm text-fal-muted">
              Confirme o endereço da loja pelo WhatsApp se precisar.
            </p>
          )}
        </section>
      ) : null}

      {awaitingPayment ? (
        <div className="rounded-fal border border-amber-300 bg-amber-50/60 p-5">
          <h3 className="mt-0 text-base font-extrabold text-fal-navy">Continuar pagamento</h3>
          <p className="mt-1 text-sm text-fal-muted">
            Pedido reservado. O Pix tem prazo curto — se expirar, gere um novo QR ou pague no
            cartão (o pedido permanece até 48 h). Sem pagamento aprovado em 48 h, o pedido é
            cancelado e sai da fila. Após a aprovação, esta tela atualiza sozinha. Para alterar
            itens, cancele o pedido (os itens voltam ao carrinho).
          </p>
          <div className="mt-4">
            <ResumeOrderPaymentPanel order={order} onPaid={() => void reload()} />
          </div>
        </div>
      ) : null}

      {canPostDelivery ? (
        <div className="rounded-fal border border-fal-line bg-white p-5">
          <h3 className="mt-0 text-base font-extrabold text-fal-navy">Pós-entrega</h3>
          <p className="mt-1 text-sm text-fal-muted">
            Confirme o recebimento ou avise se houve algum problema.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            {order.status === 'entregue' ? (
              receiptConfirmed ? (
                <p className="mb-0 text-sm font-semibold text-fal-navy">
                  Você já confirmou o recebimento.
                </p>
              ) : (
                <Button
                  type="button"
                  disabled={actionBusy}
                  onClick={() => void onConfirmReceipt()}
                >
                  Confirmar recebimento
                </Button>
              )
            ) : null}
            <Button
              type="button"
              variant="outline"
              disabled={actionBusy}
              onClick={() => void onReportDeliveryIssue()}
            >
              Tive um problema
            </Button>
          </div>
        </div>
      ) : null}

      {awaitingDecision ? (
        <div className="rounded-fal border border-sky-300 bg-sky-50/70 p-5">
          <h3 className="mt-0 text-base font-extrabold text-fal-navy">
            {proposalKind === 'prazo'
              ? 'Prazo de entrega maior'
              : proposalKind === 'parcial'
                ? 'Item(ns) indisponível(is)'
                : proposalKind === 'escolha'
                  ? 'Precisamos da sua decisão'
                  : 'A loja pediu sua decisão'}
          </h3>
          <p className="mt-1 text-sm text-fal-muted">
            Nada é aplicado em silêncio. Escolha com clareza como prefere seguir.
          </p>
          {decisionRequestReason ? (
            <p className="mt-2 rounded-md border border-sky-200 bg-white px-3 py-2 text-sm text-fal-ink">
              <strong>Mensagem da loja:</strong> {decisionRequestReason}
            </p>
          ) : null}
          {proposalKind === 'parcial' || proposalKind === 'escolha' ? (
            <p className="mt-2 text-xs text-fal-muted">
              O valor do item faltante, se houver, será tratado pela loja (estorno manual). Os
              totais do pedido não mudam automaticamente.
            </p>
          ) : null}
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
                onClick={() => void onRespondDecision('continue_available')}
              >
                {proposalKind === 'prazo' ? 'Aceitar novo prazo' : 'Continuar com o disponível'}
              </Button>
              {proposalKind !== 'prazo' ? (
                <Button
                  type="button"
                  variant="outline"
                  disabled={actionBusy}
                  onClick={() => void onRespondDecision('wait_arrival')}
                >
                  Esperar o prazo informado
                </Button>
              ) : null}
              <Button
                type="button"
                variant="light"
                disabled={actionBusy}
                onClick={() => void onRespondDecision('cancel_order')}
              >
                Cancelar o pedido
              </Button>
            </div>
          ) : (
            <p className="mb-0 mt-3 text-sm font-semibold text-fal-navy">
              {order.customerDecision === 'authorized' ||
              order.customerDecision === 'continue_available'
                ? 'Você confirmou. Aguardando a loja liberar o pedido para separação.'
                : order.customerDecision === 'wait_arrival'
                  ? 'Você pediu para esperar. A loja retomará quando houver disponibilidade.'
                  : order.customerDecision === 'rejected' ||
                      order.customerDecision === 'cancel_order'
                    ? 'Você pediu cancelamento. A loja analisará o pedido.'
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
                  Código {i.sku}
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
          <div className="flex justify-between gap-3">
            <span>
              Frete
              {contractedShip ? (
                <span className="mt-0.5 block text-xs font-normal text-fal-muted">
                  {contractedShip.label}
                  {contractedShip.etaLabel ? ` · ${contractedShip.etaLabel}` : ''}
                </span>
              ) : null}
            </span>
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
          <h3 className="mt-0 text-base font-extrabold">Endereço de entrega</h3>
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
              {paymentProviderLabel(order.payment.provider)} ·{' '}
              {paymentStatusLabel(order.payment.status)}
              <br />
              {order.payment.amount != null ? money(order.payment.amount) : null}
              {order.payment.externalRef ? (
                <>
                  <br />
                  Código da cobrança: {order.payment.externalRef}
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
              <strong>{contractedShip?.label ?? String(order.shipment.provider ?? 'Frete')}</strong>
              {contractedShip?.etaLabel ? (
                <>
                  <br />
                  Prazo: {contractedShip.etaLabel}
                </>
              ) : null}
              <br />
              Status: {shipmentStatusLabel(order.shipment.status)}
              <br />
              {order.shipment.amount != null
                ? money(order.shipment.amount)
                : money(order.shippingAmount)}
              {(() => {
                const meta = order.shipment?.metadata ?? null
                const own = meta?.own as Record<string, unknown> | undefined
                const me = meta?.me as Record<string, unknown> | undefined
                const trackingUrl = buildTrackingUrl({
                  trackingCode: order.shipment?.trackingCode,
                  trackingUrl:
                    (meta?.tracking_url as string | undefined) ??
                    (own?.tracking_url as string | undefined) ??
                    (me?.tracking_url as string | undefined) ??
                    null,
                  carrier: order.shipment?.carrier,
                  provider: order.shipment?.provider,
                })
                if (!order.shipment?.trackingCode && !trackingUrl) return null
                return (
                  <>
                    <br />
                    Rastreio:{' '}
                    {trackingUrl ? (
                      <a
                        href={trackingUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-semibold text-fal-navy underline"
                      >
                        {order.shipment?.trackingCode || 'Acompanhar envio'}
                      </a>
                    ) : (
                      order.shipment?.trackingCode
                    )}
                  </>
                )
              })()}
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
            const payload = ev.payload as Record<string, unknown>
            const note =
              (typeof payload.reason === 'string' && payload.reason) ||
              (typeof payload.note === 'string' && payload.note) ||
              null
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
