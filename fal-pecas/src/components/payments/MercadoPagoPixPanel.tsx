import { Button } from '@/components/common/Button'
import { Loading } from '@/components/common/Loading'
import { formatMoney } from '@/lib/money'
import {
  formatCountdown,
  isPaymentExpired,
  PIX_PAYMENT_TTL_MINUTES,
  secondsUntilExpiry,
  UNPAID_ORDER_TTL_HOURS,
} from '@/services/payments/mpCreatePaymentCore'
import { getOwnPayment, type OwnPaymentRow } from '@/services/payments/ownPaymentService'
import { useEffect, useState } from 'react'

interface Props {
  paymentId: string
  orderId: string
  onApproved: (orderId: string) => void
  /** Seed da resposta create-mp-payment (evita depender só do poll RLS). */
  initialPixQrCode?: string | null
  initialPixQrCodeBase64?: string | null
  initialAmount?: number
  initialExpiresAt?: string | null
  /** Quando o QR expira (5 min) — pedido permanece; UI pode oferecer novo Pix/cartão. */
  onExpired?: () => void
}

export function MercadoPagoPixPanel({
  paymentId,
  orderId,
  onApproved,
  initialPixQrCode,
  initialPixQrCodeBase64,
  initialAmount,
  initialExpiresAt,
  onExpired,
}: Props) {
  const [row, setRow] = useState<OwnPaymentRow | null>(() =>
    initialPixQrCode || initialPixQrCodeBase64
      ? {
          id: paymentId,
          orderId,
          status: 'pending',
          provider: 'mercadopago',
          providerStatus: null,
          amount: initialAmount ?? 0,
          method: 'pix',
          pixQrCode: initialPixQrCode ?? null,
          pixQrCodeBase64: initialPixQrCodeBase64 ?? null,
          paymentUrl: null,
          expiresAt: initialExpiresAt ?? null,
        }
      : null,
  )
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [remaining, setRemaining] = useState(() =>
    secondsUntilExpiry(initialExpiresAt ?? null),
  )
  const [localExpired, setLocalExpired] = useState(() =>
    isPaymentExpired(initialExpiresAt ?? null),
  )

  useEffect(() => {
    let cancelled = false
    let timer: ReturnType<typeof setInterval> | undefined

    async function tick() {
      try {
        const p = await getOwnPayment(paymentId)
        if (cancelled) return
        if (p) {
          setRow((prev) => ({
            ...p,
            pixQrCode: p.pixQrCode ?? prev?.pixQrCode ?? null,
            pixQrCodeBase64: p.pixQrCodeBase64 ?? prev?.pixQrCodeBase64 ?? null,
            expiresAt: p.expiresAt ?? prev?.expiresAt ?? null,
          }))
          if (p.expiresAt) {
            setRemaining(secondsUntilExpiry(p.expiresAt))
            if (isPaymentExpired(p.expiresAt)) setLocalExpired(true)
          }
        }
        setError(null)
        if (p?.status === 'approved') {
          onApproved(p.orderId || orderId)
        }
        if (p?.status === 'expired') {
          setLocalExpired(true)
        }
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Erro ao consultar pagamento')
      }
    }

    void tick()
    timer = setInterval(() => void tick(), 4000)
    return () => {
      cancelled = true
      if (timer) clearInterval(timer)
    }
  }, [paymentId, orderId, onApproved])

  useEffect(() => {
    const expiresAt = row?.expiresAt ?? initialExpiresAt ?? null
    if (!expiresAt || localExpired) return

    const id = setInterval(() => {
      const left = secondsUntilExpiry(expiresAt)
      setRemaining(left)
      if (left <= 0) {
        setLocalExpired(true)
        onExpired?.()
      }
    }, 1000)
    return () => clearInterval(id)
  }, [row?.expiresAt, initialExpiresAt, localExpired, onExpired])

  async function copyPix() {
    if (!row?.pixQrCode) return
    await navigator.clipboard.writeText(row.pixQrCode)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const expired = localExpired || row?.status === 'expired' || isPaymentExpired(row?.expiresAt)
  const imgSrc = row?.pixQrCodeBase64
    ? row.pixQrCodeBase64.startsWith('data:')
      ? row.pixQrCodeBase64
      : `data:image/png;base64,${row.pixQrCodeBase64}`
    : null

  return (
    <div className="space-y-4">
      <h2 className="mt-0 text-lg font-extrabold">Pix — aguardando confirmação</h2>
      <p className="text-sm text-fal-muted">
        Escaneie o QR ou copie o código. Este Pix expira em{' '}
        <strong>{PIX_PAYMENT_TTL_MINUTES} minutos</strong>. Se expirar, o pedido continua disponível
        por até {UNPAID_ORDER_TTL_HOURS} h para gerar um novo Pix ou pagar no cartão.
      </p>
      {error ? (
        <p className="rounded-fal border border-fal-danger/30 bg-red-50 px-3 py-2 text-sm text-fal-danger">
          {error}
        </p>
      ) : null}
      {!row ? <Loading label="Carregando Pix…" /> : null}
      {row ? (
        <>
          <p className="text-sm">
            <strong>Valor:</strong> {formatMoney(row.amount)}
            {!expired && (row.expiresAt || initialExpiresAt) ? (
              <>
                {' '}
                · <strong>Tempo restante:</strong>{' '}
                <span className="font-mono text-base font-extrabold text-fal-navy">
                  {formatCountdown(remaining)}
                </span>
              </>
            ) : null}
          </p>
          {expired ? (
            <p className="rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-950">
              Código Pix expirado. O pedido <strong>não foi cancelado</strong> — em Meus pedidos
              você pode gerar um novo Pix ou pagar com cartão (até {UNPAID_ORDER_TTL_HOURS} h após a
              criação do pedido).
            </p>
          ) : null}
          {row.status === 'rejected' || row.status === 'cancelled' ? (
            <p className="text-sm text-fal-danger">Pagamento não aprovado ({row.status}).</p>
          ) : null}
          {!expired && imgSrc ? (
            <img
              src={imgSrc}
              alt="QR Code Pix"
              className="mx-auto h-48 w-48 rounded-fal border border-fal-line bg-white p-2"
            />
          ) : null}
          {!expired && row.pixQrCode ? (
            <div className="space-y-2">
              <textarea
                readOnly
                className="w-full rounded-fal border border-fal-line p-2 font-mono text-xs"
                rows={3}
                value={row.pixQrCode}
              />
              <Button type="button" variant="primary" onClick={() => void copyPix()}>
                {copied ? 'Copiado!' : 'Copiar código Pix'}
              </Button>
            </div>
          ) : null}
          {!expired && !row.pixQrCode ? (
            <p className="text-sm text-fal-muted">
              QR ainda não disponível. Aguarde ou atualize em instantes.
            </p>
          ) : null}
          <p className="text-xs text-fal-muted">
            Status: {expired ? 'expired' : row.status}
            {row.providerStatus ? ` (MP: ${row.providerStatus})` : ''} · Pedido {orderId.slice(0, 8)}…
          </p>
        </>
      ) : null}
    </div>
  )
}
