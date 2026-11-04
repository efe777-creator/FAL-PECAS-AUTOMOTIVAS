import { Button } from '@/components/common/Button'
import { Loading } from '@/components/common/Loading'
import { MercadoPagoCardBrickPanel } from '@/components/payments/MercadoPagoCardBrickPanel'
import { MercadoPagoPixPanel } from '@/components/payments/MercadoPagoPixPanel'
import { createMercadoPagoPayment } from '@/services/payments/mpCreatePaymentService'
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
 * Regenera cobrança Pix se expirada / sem QR.
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
  } | null>(() => {
    if (initialChannel !== 'pix' || !payment?.id) return null
    const expired =
      payment.expiresAt != null && new Date(payment.expiresAt).getTime() < Date.now()
    if (expired || payment.status === 'expired') return null
    if (payment.pixQrCode || payment.pixQrCodeBase64) {
      return {
        paymentId: payment.id,
        pixQrCode: payment.pixQrCode,
        pixQrCodeBase64: payment.pixQrCodeBase64,
        amount: payment.amount ?? order.total,
      }
    }
    return null
  })
  const [cardReady, setCardReady] = useState(initialChannel === 'card')

  const expired =
    payment?.expiresAt != null && new Date(payment.expiresAt).getTime() < Date.now()
  const needsNewPix =
    channel === 'pix' &&
    (!pixSession || expired || payment?.status === 'expired' || payment?.status === 'rejected')

  const onApproved = useCallback(() => {
    onPaid()
  }, [onPaid])

  async function generatePix() {
    setBusy(true)
    setError(null)
    try {
      const mp = await createMercadoPagoPayment(order.id)
      if (!mp.pixQrCode && !mp.pixQrCodeBase64) {
        throw new Error('Cobrança sem QR Pix. Tente novamente em instantes.')
      }
      setPixSession({
        paymentId: mp.paymentId,
        pixQrCode: mp.pixQrCode,
        pixQrCodeBase64: mp.pixQrCodeBase64,
        amount: mp.amount ?? order.total,
      })
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Falha ao gerar Pix')
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

      {payment?.expiresAt ? (
        <p className="m-0 text-xs text-fal-muted">
          Expira em: {new Date(payment.expiresAt).toLocaleString('pt-BR')}
          {expired ? ' (expirado — gere novo Pix)' : ''}
        </p>
      ) : null}

      {error ? <p className="m-0 text-sm text-fal-danger">{error}</p> : null}

      {channel === 'pix' ? (
        needsNewPix ? (
          <div className="space-y-2">
            <p className="m-0 text-sm text-fal-muted">
              {expired || payment?.status === 'expired'
                ? 'Cobrança Pix expirada. Gere um novo QR para continuar.'
                : 'Gere ou reabra a cobrança Pix deste pedido.'}
            </p>
            <Button type="button" variant="primary" disabled={busy} onClick={() => void generatePix()}>
              {busy ? 'Gerando…' : 'Gerar / reabrir Pix'}
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
          />
        ) : (
          <Loading label="Preparando Pix…" />
        )
      ) : null}

      {channel === 'card' ? (
        !mpPublicKey ? (
          <p className="m-0 text-sm text-fal-danger">VITE_MP_PUBLIC_KEY não configurada.</p>
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
