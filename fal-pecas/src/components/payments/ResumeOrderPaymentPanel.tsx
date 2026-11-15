import { Button } from '@/components/common/Button'
import { Loading } from '@/components/common/Loading'
import { AsaasCardPanel } from '@/components/payments/AsaasCardPanel'
import { MercadoPagoCardBrickPanel } from '@/components/payments/MercadoPagoCardBrickPanel'
import { MercadoPagoPixPanel } from '@/components/payments/MercadoPagoPixPanel'
import { isUsableMpPublicKey } from '@/lib/mpAdminStatus'
import { toUserMessage } from '@/lib/toUserMessage'
import {
  isPaymentExpired,
  PIX_PAYMENT_TTL_MINUTES,
  UNPAID_ORDER_TTL_HOURS,
} from '@/services/payments/mpCreatePaymentCore'
import { usePaymentDisplay } from '@/hooks/usePaymentDisplay'
import { usePaymentRoutingConfig } from '@/hooks/usePaymentRoutingConfig'
import { createFalPayment } from '@/services/payments/engine'
import { resolveEffectivePaymentAvailability } from '@/services/payments/effectivePaymentAvailability'
import { ASAAS_CARD_CHECKOUT_READY } from '@/services/payments/falPayCapabilities'
import { decidePaymentRoute, moneyToAmountCents } from '@/services/payments/routing/paymentRouter'
import { isMercadoPagoCheckoutEnabled } from '@/services/payments/paymentService'
import {
  isCardMpChannel,
  preferredPaymentTypeFromChannel,
  resolveSelectableChannel,
  type MpPayChannel,
} from '@/services/checkout/checkoutPaymentChannel'
import type { OrderDetail } from '@/types'
import { useCallback, useEffect, useMemo, useState } from 'react'

interface Props {
  order: OrderDetail
  onPaid: () => void
}

/**
 * Retoma Pix/crédito/débito para pedido em aguardando_pagamento (Meus Pedidos).
 * Crédito↔débito NÃO remonta Secure Fields (só preferredPaymentType).
 * Pix TTL (PIX_PAYMENT_TTL_MINUTES) ≠ cancelamento do pedido (48 h).
 */
export function ResumeOrderPaymentPanel({ order, onPaid }: Props) {
  const mpEnabled = isMercadoPagoCheckoutEnabled()
  const paymentDisplay = usePaymentDisplay()
  const paymentRouting = usePaymentRoutingConfig()
  const payAvail = resolveEffectivePaymentAvailability(
    paymentDisplay,
    paymentRouting,
    moneyToAmountCents(order.total),
  )
  const mpPublicKeyRaw = (import.meta.env.VITE_MP_PUBLIC_KEY as string | undefined)?.trim() ?? ''
  const mpPublicKey = isUsableMpPublicKey(mpPublicKeyRaw) ? mpPublicKeyRaw : ''
  const payment = order.payment
  const method = (payment?.method ?? '').toLowerCase()
  const initialChannel = resolveSelectableChannel(
    method.includes('debit')
      ? 'debit_card'
      : method.includes('credit') || method.includes('card')
        ? 'credit_card'
        : 'pix',
    payAvail,
  )

  const [channel, setChannel] = useState<MpPayChannel>(initialChannel)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pixSession, setPixSession] = useState<{
    paymentId: string
    pixQrCode?: string | null
    pixQrCodeBase64?: string | null
    amount: number
    expiresAt?: string | null
  } | null>(() => {
    if (initialChannel !== 'pix' || !payment?.id) return null
    if (isPaymentExpired(payment.expiresAt) || payment.status === 'expired') return null
    if (payment.pixQrCode || payment.pixQrCodeBase64) {
      return {
        paymentId: payment.id,
        pixQrCode: payment.pixQrCode,
        pixQrCodeBase64: payment.pixQrCodeBase64,
        amount: payment.amount ?? order.total,
        expiresAt: payment.expiresAt,
      }
    }
    return null
  })
  const [cardReady, setCardReady] = useState(isCardMpChannel(initialChannel))

  const cardRoute = useMemo(
    () =>
      decidePaymentRoute(
        {
          method: channel === 'debit_card' ? 'debit_card' : 'credit_card',
          amountCents: moneyToAmountCents(order.total),
          pixMpMaxAmountCents: paymentRouting.pixMpMaxAmountCents,
        },
        {
          pixMpMaxAmountCents: paymentRouting.pixMpMaxAmountCents,
          pixBelowLimitProvider: paymentRouting.pixBelowLimitProvider,
          pixAboveLimitProvider: paymentRouting.pixAboveLimitProvider,
          cardProvider: paymentRouting.cardProvider,
          boletoProvider: paymentRouting.boletoProvider,
          asaasCardCheckoutReady: ASAAS_CARD_CHECKOUT_READY,
        },
      ),
    [channel, order.total, paymentRouting],
  )

  function selectChannel(desired: MpPayChannel) {
    const next = resolveSelectableChannel(desired, payAvail)
    setChannel(next)
    if (isCardMpChannel(next)) setCardReady(true)
  }

  useEffect(() => {
    const next = resolveSelectableChannel(channel, payAvail)
    if (next !== channel) {
      setChannel(next)
      if (isCardMpChannel(next)) setCardReady(true)
    }
  }, [payAvail.pix, payAvail.card, payAvail.credit, payAvail.debit, channel])

  const orderPaymentExpired =
    isPaymentExpired(payment?.expiresAt) ||
    payment?.status === 'expired' ||
    payment?.status === 'rejected'
  const needsNewPix = channel === 'pix' && !pixSession

  const onApproved = useCallback(() => {
    onPaid()
  }, [onPaid])

  async function generatePix() {
    setBusy(true)
    setError(null)
    try {
      const mp = await createFalPayment({ orderId: order.id, method: 'pix' })
      if (!mp.pixQrCode && !mp.pixQrCodeBase64) {
        throw new Error('Cobrança sem QR Pix. Tente novamente em instantes.')
      }
      setPixSession({
        paymentId: mp.paymentId,
        pixQrCode: mp.pixQrCode,
        pixQrCodeBase64: mp.pixQrCodeBase64,
        amount: mp.amount ?? order.total,
        expiresAt: mp.expiresAt ?? null,
      })
    } catch (e) {
      setError(toUserMessage(e, 'Falha ao gerar Pix'))
    } finally {
      setBusy(false)
    }
  }

  if (!mpEnabled) {
    return (
      <p className="m-0 text-sm text-fal-muted">
        Checkout Mercado Pago desligado neste ambiente. O pedido permanece aguardando pagamento.
      </p>
    )
  }

  const channelCount =
    (payAvail.pix ? 1 : 0) + (payAvail.credit ? 1 : 0) + (payAvail.debit ? 1 : 0)

  return (
    <div className="space-y-4">
      <p className="m-0 text-xs text-fal-muted">
        Pix válido por {PIX_PAYMENT_TTL_MINUTES} minutos. Após expirar o código, o pedido segue
        reservado por até {UNPAID_ORDER_TTL_HOURS} h — você pode gerar novo Pix ou pagar no cartão.
        Sem pagamento aprovado em {UNPAID_ORDER_TTL_HOURS} h, o pedido é cancelado e retirado da
        fila.
      </p>

      {channelCount > 1 ? (
        <div
          className="flex flex-wrap gap-2"
          role="group"
          aria-label="Forma de pagamento deste pedido"
        >
          {payAvail.pix ? (
            <button
              type="button"
              className={[
                'rounded-[10px] border px-3 py-2 text-sm font-bold',
                channel === 'pix'
                  ? 'border-fal-navy bg-fal-navy text-white'
                  : 'border-fal-line bg-white text-fal-navy',
              ].join(' ')}
              onClick={() => selectChannel('pix')}
            >
              Pix
            </button>
          ) : null}
          {payAvail.credit ? (
            <button
              type="button"
              className={[
                'rounded-[10px] border px-3 py-2 text-sm font-bold',
                channel === 'credit_card'
                  ? 'border-fal-navy bg-fal-navy text-white'
                  : 'border-fal-line bg-white text-fal-navy',
              ].join(' ')}
              onClick={() => selectChannel('credit_card')}
            >
              Crédito
            </button>
          ) : null}
          {payAvail.debit ? (
            <button
              type="button"
              className={[
                'rounded-[10px] border px-3 py-2 text-sm font-bold',
                channel === 'debit_card'
                  ? 'border-fal-navy bg-fal-navy text-white'
                  : 'border-fal-line bg-white text-fal-navy',
              ].join(' ')}
              onClick={() => selectChannel('debit_card')}
            >
              Débito
            </button>
          ) : null}
        </div>
      ) : null}
      {!payAvail.pix && !payAvail.card ? (
        <p className="m-0 text-sm text-fal-muted">
          Nenhum meio de pagamento está liberado comercialmente no momento.
        </p>
      ) : null}

      {error ? <p className="m-0 text-sm text-fal-danger">{error}</p> : null}

      {channel === 'pix' && payAvail.pix ? (
        needsNewPix ? (
          <div className="space-y-2">
            <p className="m-0 text-sm text-fal-muted">
              {orderPaymentExpired
                ? 'Cobrança Pix expirada. Gere um novo QR ou escolha crédito/débito — o pedido continua ativo.'
                : `Gere a cobrança Pix deste pedido (válida por ${PIX_PAYMENT_TTL_MINUTES} minutos).`}
            </p>
            <Button type="button" variant="primary" disabled={busy} onClick={() => void generatePix()}>
              {busy ? 'Gerando…' : 'Gerar novo Pix'}
            </Button>
          </div>
        ) : pixSession ? (
          <MercadoPagoPixPanel
            paymentId={pixSession.paymentId}
            orderId={order.id}
            onApproved={onApproved}
            initialPixQrCode={pixSession.pixQrCode}
            initialPixQrCodeBase64={pixSession.pixQrCodeBase64}
            initialAmount={pixSession.amount}
            initialExpiresAt={pixSession.expiresAt}
            onExpired={() => setPixSession(null)}
          />
        ) : (
          <Loading label="Preparando Pix…" />
        )
      ) : null}

      {isCardMpChannel(channel) && payAvail.card ? (
        cardRoute.provider === 'asaas' && cardReady ? (
          <AsaasCardPanel
            orderId={order.id}
            amount={payment?.amount ?? order.total}
            preferredPaymentType={preferredPaymentTypeFromChannel(channel)}
            onApproved={onApproved}
            onError={(message) => setError(message)}
          />
        ) : cardRoute.provider !== 'asaas' && !mpPublicKey ? (
          <p className="m-0 text-sm text-fal-danger">
            Pagamento com cartão indisponível no momento. Tente Pix ou volte mais tarde.
          </p>
        ) : cardRoute.provider !== 'asaas' && cardReady ? (
          <MercadoPagoCardBrickPanel
            orderId={order.id}
            amount={payment?.amount ?? order.total}
            publicKey={mpPublicKey}
            preferredPaymentType={preferredPaymentTypeFromChannel(channel)}
            onApproved={onApproved}
            onError={(message) => setError(message)}
          />
        ) : null
      ) : null}
    </div>
  )
}
