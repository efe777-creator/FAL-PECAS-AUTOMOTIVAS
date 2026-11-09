import { Button } from '@/components/common/Button'
import { Loading } from '@/components/common/Loading'
import { MercadoPagoCardBrickPanel } from '@/components/payments/MercadoPagoCardBrickPanel'
import { MercadoPagoPixPanel } from '@/components/payments/MercadoPagoPixPanel'
import { toUserMessage } from '@/lib/toUserMessage'
import {
  isPaymentExpired,
  PIX_PAYMENT_TTL_MINUTES,
  UNPAID_ORDER_TTL_HOURS,
} from '@/services/payments/mpCreatePaymentCore'
import { createFalPayment } from '@/services/payments/engine'
import { isMercadoPagoCheckoutEnabled } from '@/services/payments/paymentService'
import type { OrderDetail } from '@/types'
import { useCallback, useState } from 'react'

type Channel = 'pix' | 'card'

interface Props {
  order: OrderDetail
  onPaid: () => void
}

/**
 * Retoma Pix/Brick para pedido em aguardando_pagamento (Meus Pedidos).
 * Pix TTL 5 min ≠ cancelamento do pedido (48 h).
 */
export function ResumeOrderPaymentPanel({ order, onPaid }: Props) {
  const mpEnabled = isMercadoPagoCheckoutEnabled()
  const mpPublicKey = (import.meta.env.VITE_MP_PUBLIC_KEY as string | undefined)?.trim() ?? ''
  const payment = order.payment
  const method = (payment?.method ?? '').toLowerCase()
  const initialChannel: Channel =
    method.includes('card') || method.includes('credit') || method.includes('debit')
      ? 'card'
      : 'pix'

  const [channel, setChannel] = useState<Channel>(initialChannel)
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
  const [cardReady, setCardReady] = useState(initialChannel === 'card')

  const expired =
    isPaymentExpired(payment?.expiresAt) ||
    payment?.status === 'expired' ||
    payment?.status === 'rejected'
  const needsNewPix = channel === 'pix' && (!pixSession || expired)

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

  return (
    <div className="space-y-4">
      <p className="m-0 text-xs text-fal-muted">
        Pix válido por {PIX_PAYMENT_TTL_MINUTES} minutos. Após expirar o código, o pedido segue
        reservado por até {UNPAID_ORDER_TTL_HOURS} h — você pode gerar novo Pix ou pagar no cartão.
        Sem pagamento aprovado em {UNPAID_ORDER_TTL_HOURS} h, o pedido é cancelado e retirado da
        fila.
      </p>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          className={[
            'rounded-[10px] border px-3 py-2 text-sm font-bold',
            channel === 'pix'
              ? 'border-fal-navy bg-fal-navy text-white'
              : 'border-fal-line bg-white text-fal-navy',
          ].join(' ')}
          onClick={() => setChannel('pix')}
        >
          Pix
        </button>
        <button
          type="button"
          className={[
            'rounded-[10px] border px-3 py-2 text-sm font-bold',
            channel === 'card'
              ? 'border-fal-navy bg-fal-navy text-white'
              : 'border-fal-line bg-white text-fal-navy',
          ].join(' ')}
          onClick={() => {
            setChannel('card')
            setCardReady(true)
          }}
        >
          Cartão
        </button>
      </div>

      {error ? <p className="m-0 text-sm text-fal-danger">{error}</p> : null}

      {channel === 'pix' ? (
        needsNewPix ? (
          <div className="space-y-2">
            <p className="m-0 text-sm text-fal-muted">
              {expired
                ? 'Cobrança Pix expirada. Gere um novo QR ou pague com cartão — o pedido continua ativo.'
                : 'Gere a cobrança Pix deste pedido (válida por 5 minutos).'}
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

      {channel === 'card' ? (
        !mpPublicKey ? (
          <p className="m-0 text-sm text-fal-danger">
            Pagamento com cartão indisponível no momento. Tente Pix ou volte mais tarde.
          </p>
        ) : cardReady ? (
          <MercadoPagoCardBrickPanel
            orderId={order.id}
            amount={payment?.amount ?? order.total}
            publicKey={mpPublicKey}
            onApproved={onApproved}
            onError={(message) => setError(message)}
          />
        ) : null
      ) : null}
    </div>
  )
}
