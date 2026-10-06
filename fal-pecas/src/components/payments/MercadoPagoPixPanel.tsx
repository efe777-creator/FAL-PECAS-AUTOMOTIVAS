import { Button } from '@/components/common/Button'
import { Loading } from '@/components/common/Loading'
import { formatMoney } from '@/lib/money'
import { getOwnPayment, type OwnPaymentRow } from '@/services/payments/ownPaymentService'
import { useEffect, useState } from 'react'

interface Props {
  paymentId: string
  orderId: string
  onApproved: (orderId: string) => void
}

export function MercadoPagoPixPanel({ paymentId, orderId, onApproved }: Props) {
  const [row, setRow] = useState<OwnPaymentRow | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    let cancelled = false
    let timer: ReturnType<typeof setInterval> | undefined

    async function tick() {
      try {
        const p = await getOwnPayment(paymentId)
        if (cancelled) return
        setRow(p)
        setError(null)
        if (p?.status === 'approved') {
          onApproved(p.orderId || orderId)
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

  async function copyPix() {
    if (!row?.pixQrCode) return
    await navigator.clipboard.writeText(row.pixQrCode)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const expired =
    row?.expiresAt != null && new Date(row.expiresAt).getTime() < Date.now()
  const imgSrc = row?.pixQrCodeBase64
    ? row.pixQrCodeBase64.startsWith('data:')
      ? row.pixQrCodeBase64
      : `data:image/png;base64,${row.pixQrCodeBase64}`
    : null

  return (
    <div className="space-y-4">
      <h2 className="mt-0 text-lg font-extrabold">Pix — aguardando confirmação</h2>
      <p className="text-sm text-fal-muted">
        Escaneie o QR ou copie o código. O pedido só será confirmado quando o Mercado Pago
        notificar o pagamento (não marcamos como pago neste navegador).
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
            {row.expiresAt ? (
              <>
                {' '}
                · <strong>Expira:</strong> {new Date(row.expiresAt).toLocaleString('pt-BR')}
              </>
            ) : null}
          </p>
          {expired || row.status === 'expired' ? (
            <p className="text-sm text-fal-danger">
              Cobrança expirada. Abra o pedido e gere um novo pagamento quando disponível.
            </p>
          ) : null}
          {row.status === 'rejected' || row.status === 'cancelled' ? (
            <p className="text-sm text-fal-danger">Pagamento não aprovado ({row.status}).</p>
          ) : null}
          {imgSrc ? (
            <img
              src={imgSrc}
              alt="QR Code Pix"
              className="mx-auto h-48 w-48 rounded-fal border border-fal-line bg-white p-2"
            />
          ) : null}
          {row.pixQrCode ? (
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
          ) : (
            <p className="text-sm text-fal-muted">
              QR ainda não disponível. Aguarde ou atualize em instantes.
            </p>
          )}
          <p className="text-xs text-fal-muted">
            Status: {row.status}
            {row.providerStatus ? ` (MP: ${row.providerStatus})` : ''} · Pedido {orderId.slice(0, 8)}…
          </p>
        </>
      ) : null}
    </div>
  )
}
