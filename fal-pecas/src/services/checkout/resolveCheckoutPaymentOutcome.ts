/**
 * AJUSTE-035 C1 — decide o próximo passo do checkout a partir de pedido + pagamento.
 * Nunca trata ausência de paymentId como aprovação.
 */

export type CheckoutPaymentOutcome =
  | { kind: 'confirmed'; orderId: string }
  | { kind: 'await_payment'; orderId: string; paymentId: string; paymentStatus: string }
  | { kind: 'retry_payment'; orderId: string; paymentId?: string; reason: string }
  | { kind: 'order_only'; orderId: string; reason: string }

const APPROVED = new Set(['approved', 'authorized'])
const RETRYABLE = new Set(['rejected', 'cancelled', 'canceled', 'expired', 'refunded'])
const PENDING = new Set(['pending', 'in_process', 'in_mediation'])

export function resolveCheckoutPaymentOutcome(input: {
  orderId: string
  orderStatus?: string | null
  paymentId?: string | null
  paymentStatus?: string | null
}): CheckoutPaymentOutcome {
  const orderId = input.orderId
  const payStatus = (input.paymentStatus ?? '').toLowerCase()

  if (input.paymentId && APPROVED.has(payStatus)) {
    return { kind: 'confirmed', orderId }
  }

  if (input.paymentId && RETRYABLE.has(payStatus)) {
    return {
      kind: 'retry_payment',
      orderId,
      paymentId: input.paymentId,
      reason:
        payStatus === 'expired'
          ? 'Cobrança expirada. Você pode gerar uma nova tentativa no mesmo pedido.'
          : 'Pagamento não aprovado. Você pode tentar novamente no mesmo pedido.',
    }
  }

  if (input.paymentId && (PENDING.has(payStatus) || !payStatus)) {
    return {
      kind: 'await_payment',
      orderId,
      paymentId: input.paymentId,
      paymentStatus: payStatus || 'pending',
    }
  }

  if (input.paymentId) {
    return {
      kind: 'await_payment',
      orderId,
      paymentId: input.paymentId,
      paymentStatus: payStatus || 'pending',
    }
  }

  return {
    kind: 'order_only',
    orderId,
    reason:
      'Pedido criado, mas a cobrança ainda não está disponível. Tente retomar o pagamento em Meus pedidos.',
  }
}
