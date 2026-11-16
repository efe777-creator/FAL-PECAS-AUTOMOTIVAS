import { getSupabase } from '@/lib/supabase'

export type ApplyPaymentConditionToOrderResult = {
  orderId: string
  method: string | null
  adjustPercent: number
  subtotal: number
  shippingAmount: number
  total: number
  paymentId?: string | null
}

/** Reaplica % da Home sobre soma dos itens (lista) + frete intacto. Idempotente. */
export async function applyPaymentConditionToOrder(
  orderId: string,
  method?: 'pix' | 'credit_card' | 'debit_card' | null,
): Promise<ApplyPaymentConditionToOrderResult> {
  const payload: Record<string, unknown> = { p_order_id: orderId }
  if (method) payload.p_method = method
  const { data, error } = await getSupabase().rpc('apply_payment_condition_to_order', payload)
  if (error) throw error
  const row = (data ?? {}) as Record<string, unknown>
  return {
    orderId: String(row.order_id ?? orderId),
    method: row.method != null ? String(row.method) : null,
    adjustPercent: Number(row.adjust_percent ?? 0),
    subtotal: Number(row.subtotal ?? 0),
    shippingAmount: Number(row.shipping_amount ?? 0),
    total: Number(row.total ?? 0),
    paymentId: row.payment_id != null ? String(row.payment_id) : null,
  }
}
