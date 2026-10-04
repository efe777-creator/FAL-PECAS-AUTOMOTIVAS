import { getSupabase } from '@/lib/supabase'
import type { PaymentIntentInput, PaymentIntentResult, PaymentProvider } from '@/types'

function mapResult(row: Record<string, unknown>): PaymentIntentResult {
  return {
    paymentId: String(row.payment_id ?? row.id ?? ''),
    provider: 'simulated',
    status: String(row.status) as PaymentIntentResult['status'],
    externalRef: row.external_ref != null ? String(row.external_ref) : undefined,
    amount: row.amount != null ? Number(row.amount) : undefined,
    orderId: row.order_id != null ? String(row.order_id) : undefined,
    orderStatus: row.order_status != null ? String(row.order_status) : undefined,
    metadata: (row.metadata as Record<string, unknown> | undefined) ?? undefined,
  }
}

/**
 * Pagamento simulado F6.
 * createIntent: lê payment pending criado por place_order.
 * confirmSimulated: RPC server-side (approve/fail + release).
 */
export const simulatedPaymentProvider: PaymentProvider = {
  async createIntent(input: PaymentIntentInput): Promise<PaymentIntentResult> {
    const { data, error } = await getSupabase()
      .from('payments')
      .select('id, provider, status, amount, external_ref, metadata, order_id')
      .eq('order_id', input.orderId)
      .eq('provider', 'simulated')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()
    if (error) throw error
    if (!data) throw new Error('Pagamento simulado não encontrado para o pedido')
    return mapResult({
      payment_id: data.id,
      status: data.status,
      external_ref: data.external_ref,
      amount: data.amount,
      order_id: data.order_id,
      metadata: { ...(data.metadata as object), method: input.method },
    })
  },

  async confirmSimulated(paymentId, outcome): Promise<PaymentIntentResult> {
    const { data, error } = await getSupabase().rpc('confirm_simulated_payment', {
      p_payment_id: paymentId,
      p_outcome: outcome,
    })
    if (error) throw error
    return mapResult((data ?? {}) as Record<string, unknown>)
  },
}
