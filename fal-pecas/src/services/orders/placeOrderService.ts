import { getSupabase } from '@/lib/supabase'
import type { PlaceOrderInput, PlaceOrderResult } from '@/types'

export async function placeOrder(input: PlaceOrderInput): Promise<PlaceOrderResult> {
  const payload = {
    idempotency_key: input.idempotencyKey,
    address_id: input.addressId,
    shipping_option_id: input.shippingOptionId,
    payment_method: input.paymentMethod,
    document_kind: input.documentKind,
    document_value: input.documentValue,
    items: input.items?.map((i) => ({
      product_id: i.productId,
      quantity: i.quantity,
    })),
  }

  const { data, error } = await getSupabase().rpc('place_order', { p_payload: payload })
  if (error) throw error

  const row = (data ?? {}) as Record<string, unknown>
  return {
    orderId: String(row.order_id),
    status: String(row.status),
    total: Number(row.total ?? 0),
    paymentId: row.payment_id != null ? String(row.payment_id) : undefined,
    alreadyExisted: Boolean(row.already_existed),
  }
}
