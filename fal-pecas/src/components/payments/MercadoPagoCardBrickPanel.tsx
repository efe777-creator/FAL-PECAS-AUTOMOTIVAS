import { Loading } from '@/components/common/Loading'
import { createMercadoPagoPayment } from '@/services/payments/mpCreatePaymentService'
import { getOwnPayment } from '@/services/payments/ownPaymentService'
import { CardPayment, initMercadoPago } from '@mercadopago/sdk-react'
import { useEffect, useRef, useState } from 'react'

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
 */
export function MercadoPagoCardBrickPanel({
  orderId,
  amount,
  publicKey,
  onApproved,
  onError,
}: Props) {
  const [ready, setReady] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [paymentId, setPaymentId] = useState<string | null>(null)
  const [status, setStatus] = useState<string>('idle')
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    try {
      ensureMpInit(publicKey)
      setReady(true)
    } catch (e) {
      onError(e instanceof Error ? e.message : 'Falha ao iniciar Mercado Pago')
    }
  }, [publicKey, onError])

  useEffect(() => {
    if (!paymentId) return
    async function tick() {
      try {
        const p = await getOwnPayment(paymentId!)
        if (!p) return
        setStatus(p.status)
        if (p.status === 'approved') {
          if (pollRef.current) clearInterval(pollRef.current)
          onApproved(p.orderId || orderId)
        }
        if (p.status === 'rejected' || p.status === 'cancelled') {
          if (pollRef.current) clearInterval(pollRef.current)
          onError(`Pagamento ${p.status}`)
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
  }, [paymentId, orderId, onApproved, onError])

  if (!ready) return <Loading label="Carregando formulário de cartão…" />

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
      <CardPayment
        initialization={{ amount }}
        customization={{
          paymentMethods: {
            maxInstallments: 12,
          },
        }}
        onSubmit={async (formData: BrickFormData) => {
          setSubmitting(true)
          try {
            const res = await createMercadoPagoPayment(orderId, {
              token: formData.token,
              paymentMethodId: formData.payment_method_id,
              installments: Number(formData.installments) || 1,
              issuerId:
                formData.issuer_id != null ? String(formData.issuer_id) : undefined,
              paymentTypeId:
                formData.payment_type_id ?? formData.payment_method_type ?? 'credit_card',
            })
            setPaymentId(res.paymentId)
            setStatus(res.status)
          } catch (e) {
            onError(e instanceof Error ? e.message : 'Falha ao criar pagamento cartão')
            throw e
          } finally {
            setSubmitting(false)
          }
        }}
        onError={(err) => {
          onError(typeof err === 'string' ? err : 'Erro no Brick de cartão')
        }}
      />
    </div>
  )
}
