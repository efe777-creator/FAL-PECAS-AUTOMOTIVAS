import { Loading } from '@/components/common/Loading'
import { createMercadoPagoPayment } from '@/services/payments/mpCreatePaymentService'
import { getOwnPayment } from '@/services/payments/ownPaymentService'
import { CardPayment, initMercadoPago } from '@mercadopago/sdk-react'
import { useCallback, useEffect, useRef, useState } from 'react'

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
 * F9-D — Card Payment Brick. PAN/CVV ficam no iframe MP.
 * Create payment no backend; approve só via webhook (poll status).
 *
 * IMPORTANTE: callbacks do CardPayment precisam ser estáveis. Re-render do
 * checkout (clear carrinho / toast / setError) com onSubmit/onError inline
 * re-inicializa o Brick e deixa o skeleton eterno (secure-fields h=0).
 */
export function MercadoPagoCardBrickPanel({
  orderId,
  amount,
  publicKey,
  onApproved,
  onError,
}: Props) {
  const [ready, setReady] = useState(false)
  const [brickReady, setBrickReady] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [paymentId, setPaymentId] = useState<string | null>(null)
  const [status, setStatus] = useState<string>('idle')
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
      onErrorRef.current(e instanceof Error ? e.message : 'Falha ao iniciar Mercado Pago')
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
          onErrorRef.current(`Pagamento ${p.status}`)
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
    setBrickKey((k) => k + 1)
  }, [])

  const handleSubmit = useCallback(
    async (formData: BrickFormData) => {
      setSubmitting(true)
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
        const msg = e instanceof Error ? e.message : 'Falha ao criar pagamento cartão'
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
            : 'Erro no Brick de cartão'
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
        Valor inválido para o Brick ({String(amount)}). Recrie o pedido.
      </p>
    )
  }

  if (paymentId) {
    return (
      <div className="space-y-3">
        <h2 className="mt-0 text-lg font-extrabold">Cartão — aguardando confirmação</h2>
        <p className="text-sm text-fal-muted">
          Pagamento enviado. A confirmação chega via webhook — não marcamos como pago neste
          navegador.
        </p>
        <p className="text-xs text-fal-muted">Status: {status}</p>
        <Loading label="Aguardando confirmação…" />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <h2 className="mt-0 text-lg font-extrabold">Pagamento com cartão</h2>
      <p className="text-sm text-fal-muted">
        Dados do cartão são tokenizados pelo Mercado Pago (sem PAN/CVV na FAL). Valor cobrado =
        total do pedido no servidor.
      </p>
      {submitting ? <Loading label="Processando cartão…" /> : null}
      {!brickReady ? (
        <p className="text-xs text-fal-muted">Montando campos seguros do Mercado Pago…</p>
      ) : null}
      <CardPayment
        key={`${orderId}-${brickKey}`}
        initialization={{ amount: amountNum }}
        customization={{
          paymentMethods: {
            maxInstallments: 12,
          },
        }}
        onSubmit={handleSubmit}
        onReady={handleBrickReady}
        onError={handleBrickError}
      />
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
