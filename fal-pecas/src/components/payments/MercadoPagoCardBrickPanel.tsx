import { Button } from '@/components/common/Button'
import { Loading } from '@/components/common/Loading'
import { usePaymentDisplay } from '@/hooks/usePaymentDisplay'
import { resolveInstallmentCount } from '@/lib/paymentDisplay'
import { paymentStatusLabel } from '@/lib/paymentLabels'
import { toUserMessage } from '@/lib/toUserMessage'
import { createMercadoPagoPayment } from '@/services/payments/mpCreatePaymentService'
import { getOwnPayment } from '@/services/payments/ownPaymentService'
import { CardPayment, initMercadoPago } from '@mercadopago/sdk-react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

interface Props {
  orderId: string
  amount: number
  publicKey: string
  onApproved: (orderId: string) => void
  onError: (message: string) => void
}

type BrickFormData = {
  token: string
  payment_method_id: string
  installments: number
  issuer_id?: string | number
  payment_method_type?: string
  payment_type_id?: string
}

let mpInitedKey: string | null = null

function ensureMpInit(publicKey: string) {
  if (mpInitedKey === publicKey) return
  initMercadoPago(publicKey, { locale: 'pt-BR' })
  mpInitedKey = publicKey
}

/**
 * Card Payment Brick. Dados do cartão ficam no iframe do Mercado Pago.
 * Create payment no backend; approve só via webhook (poll status).
 */
export function MercadoPagoCardBrickPanel({
  orderId,
  amount,
  publicKey,
  onApproved,
  onError,
}: Props) {
  const paymentDisplay = usePaymentDisplay()
  const maxInstallments = useMemo(() => {
    if (!paymentDisplay?.enabled) return 12
    return Math.min(12, resolveInstallmentCount(amount, paymentDisplay))
  }, [amount, paymentDisplay])
  const [ready, setReady] = useState(false)
  const [brickReady, setBrickReady] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [paymentId, setPaymentId] = useState<string | null>(null)
  const [status, setStatus] = useState<string>('idle')
  const [rejectReason, setRejectReason] = useState<string | null>(null)
  const [brickKey, setBrickKey] = useState(0)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const onApprovedRef = useRef(onApproved)
  const onErrorRef = useRef(onError)

  useEffect(() => {
    onApprovedRef.current = onApproved
  }, [onApproved])

  useEffect(() => {
    onErrorRef.current = onError
  }, [onError])

  const amountNum = Number(amount)

  useEffect(() => {
    try {
      ensureMpInit(publicKey)
      setReady(true)
    } catch (e) {
      onErrorRef.current(toUserMessage(e, 'Falha ao iniciar o pagamento'))
    }
  }, [publicKey])

  useEffect(() => {
    if (!paymentId) return
    async function tick() {
      try {
        const p = await getOwnPayment(paymentId!)
        if (!p) return
        setStatus(p.status)
        if (p.status === 'approved') {
          if (pollRef.current) clearInterval(pollRef.current)
          onApprovedRef.current(p.orderId || orderId)
        }
        if (p.status === 'rejected' || p.status === 'cancelled') {
          if (pollRef.current) clearInterval(pollRef.current)
          const msg =
            p.status === 'rejected'
              ? 'Pagamento recusado. Verifique os dados do cartão ou use outro meio.'
              : 'Pagamento cancelado. Você pode tentar novamente.'
          setRejectReason(msg)
          onErrorRef.current(msg)
          setPaymentId(null)
        }
      } catch {
        /* poll best-effort */
      }
    }
    void tick()
    pollRef.current = setInterval(() => void tick(), 4000)
    return () => {
      if (pollRef.current) clearInterval(pollRef.current)
    }
  }, [paymentId, orderId])

  const remountBrick = useCallback(() => {
    setBrickReady(false)
    setRejectReason(null)
    setStatus('idle')
    setBrickKey((k) => k + 1)
  }, [])

  const handleSubmit = useCallback(
    async (formData: BrickFormData) => {
      setSubmitting(true)
      setRejectReason(null)
      try {
        const res = await createMercadoPagoPayment(orderId, {
          token: formData.token,
          paymentMethodId: formData.payment_method_id,
          installments: Number(formData.installments) || 1,
          issuerId: formData.issuer_id != null ? String(formData.issuer_id) : undefined,
          paymentTypeId:
            formData.payment_type_id ?? formData.payment_method_type ?? 'credit_card',
        })
        setPaymentId(res.paymentId)
        setStatus(res.status)
      } catch (e) {
        const msg = toUserMessage(e, 'Falha ao criar pagamento com cartão')
        onErrorRef.current(msg)
        remountBrick()
        throw e
      } finally {
        setSubmitting(false)
      }
    },
    [orderId, remountBrick],
  )

  const handleBrickError = useCallback(
    (err: unknown) => {
      const msg =
        typeof err === 'string'
          ? err
          : err && typeof err === 'object' && 'message' in err
            ? String((err as { message: unknown }).message)
            : 'Erro no formulário de cartão'
      onErrorRef.current(msg)
      remountBrick()
    },
    [remountBrick],
  )

  const handleBrickReady = useCallback(() => {
    setBrickReady(true)
  }, [])

  if (!ready) return <Loading label="Carregando formulário de cartão…" />

  if (!Number.isFinite(amountNum) || amountNum <= 0) {
    return (
      <p className="text-sm text-fal-danger">
        Valor inválido para cobrança. Recrie o pedido.
      </p>
    )
  }

  if (paymentId) {
    return (
      <div className="space-y-3">
        <h2 className="mt-0 text-lg font-extrabold">Cartão — aguardando confirmação</h2>
        <p className="text-sm text-fal-muted">
          Pagamento enviado. Estamos confirmando com o banco — isso pode levar alguns segundos.
        </p>
        <p className="text-xs text-fal-muted">Status: {paymentStatusLabel(status)}</p>
        <Loading label="Aguardando confirmação…" />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <h2 className="mt-0 text-lg font-extrabold">Pagamento com cartão</h2>
      <p className="text-sm text-fal-muted">
        Os dados do cartão são protegidos pelo Mercado Pago. O valor cobrado é o total do pedido.
      </p>
      {rejectReason ? (
        <div className="rounded-[10px] border border-fal-danger/30 bg-red-50 p-3 text-sm text-fal-danger">
          <p className="m-0 font-semibold">{rejectReason}</p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="mt-2"
            onClick={remountBrick}
          >
            Tentar novamente
          </Button>
        </div>
      ) : null}
      {submitting ? <Loading label="Processando cartão…" /> : null}
      {!brickReady ? (
        <p className="text-xs text-fal-muted">Montando campos seguros do Mercado Pago…</p>
      ) : null}
      <CardPayment
        key={`${orderId}-${brickKey}-${maxInstallments}`}
        initialization={{ amount: amountNum }}
        customization={{
          paymentMethods: {
            maxInstallments,
          },
        }}
        onSubmit={handleSubmit}
        onReady={handleBrickReady}
        onError={handleBrickError}
      />
      {paymentDisplay?.enabled && paymentDisplay.interestFree ? (
        <p className="m-0 text-xs text-fal-muted">
          Parcelas no cartão conforme regras do Mercado Pago e da conta FAL. A vitrine indica
          condições comerciais; o valor cobrado é o total do pedido.
        </p>
      ) : null}
      {!brickReady ? (
        <button
          type="button"
          className="text-sm font-semibold text-fal-ink underline"
          onClick={remountBrick}
        >
          Formulário não carregou? Recarregar
        </button>
      ) : null}
    </div>
  )
}
