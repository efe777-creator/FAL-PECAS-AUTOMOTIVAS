import { getSupabase } from '@/lib/supabase'
import { isPaymentExpired } from '@/services/payments/mpCreatePaymentCore'
import { resolveCheckoutPaymentOutcome, type CheckoutPaymentOutcome } from './resolveCheckoutPaymentOutcome'
import type { CheckoutSessionChannel } from './checkoutSession'

export type ResumeCheckoutResult = {
  outcome: CheckoutPaymentOutcome
  orderId: string
  orderStatus: string
  total: number
  paymentId?: string
  paymentStatus?: string
  channel: CheckoutSessionChannel
  pixQrCode?: string | null
  pixQrCodeBase64?: string | null
  expiresAt?: string | null
}

function channelFromMethod(method: string | null | undefined): CheckoutSessionChannel {
  const m = (method ?? '').toLowerCase()
  if (m.includes('card') || m.includes('credit') || m.includes('debit')) return 'card'
  return 'pix'
}

/**
 * C2 — verdade do servidor para retomar checkout após refresh.
 */
export async function resumeCheckoutFromServer(orderId: string): Promise<ResumeCheckoutResult | null> {
  const { data: order, error: orderErr } = await getSupabase()
    .from('orders')
    .select('id, status, total')
    .eq('id', orderId)
    .maybeSingle()
  if (orderErr) throw orderErr
  if (!order) return null

  const { data: payment, error: payErr } = await getSupabase()
    .from('payments')
    .select(
      'id, status, method, amount, pix_qr_code, pix_qr_code_base64, expires_at',
    )
    .eq('order_id', orderId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (payErr) throw payErr

  let outcome = resolveCheckoutPaymentOutcome({
    orderId: String(order.id),
    orderStatus: String(order.status),
    paymentId: payment?.id != null ? String(payment.id) : undefined,
    paymentStatus: payment?.status != null ? String(payment.status) : undefined,
  })

  // pending no banco mas TTL Pix já passou → retry (não exibir QR morto sem CTA)
  const expiresAt = (payment?.expires_at as string | null | undefined) ?? null
  if (
    outcome.kind === 'await_payment' &&
    isPaymentExpired(expiresAt)
  ) {
    outcome = {
      kind: 'retry_payment',
      orderId: String(order.id),
      paymentId: payment?.id != null ? String(payment.id) : undefined,
      reason:
        'Cobrança Pix expirada. Você pode gerar uma nova tentativa no mesmo pedido ou pagar com cartão.',
    }
  }

  return {
    outcome,
    orderId: String(order.id),
    orderStatus: String(order.status),
    total: Number(payment?.amount ?? order.total ?? 0),
    paymentId: payment?.id != null ? String(payment.id) : undefined,
    paymentStatus: payment?.status != null ? String(payment.status) : undefined,
    channel: channelFromMethod(payment?.method as string | undefined),
    pixQrCode: (payment?.pix_qr_code as string | null | undefined) ?? null,
    pixQrCodeBase64: (payment?.pix_qr_code_base64 as string | null | undefined) ?? null,
    expiresAt,
  }
}
