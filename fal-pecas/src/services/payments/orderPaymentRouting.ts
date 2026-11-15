import { getSupabase } from '@/lib/supabase'
import {
  decidePaymentRoute,
  moneyToAmountCents,
  type PaymentRouteDecision,
  type RoutablePaymentMethod,
} from '@/services/payments/routing/paymentRouter'

export async function getOrderTotalForPayment(orderId: string): Promise<number> {
  const { data, error } = await getSupabase()
    .from('orders')
    .select('total')
    .eq('id', orderId)
    .maybeSingle()
  if (error) throw error
  if (!data) throw new Error('Pedido não encontrado para roteamento de pagamento.')
  const total = Number(data.total)
  if (!(total > 0)) throw new Error('Total do pedido inválido.')
  return total
}

export async function decidePaymentRouteForOrder(
  orderId: string,
  method: RoutablePaymentMethod,
  pixMpMaxAmountCents?: number,
): Promise<PaymentRouteDecision> {
  const total = await getOrderTotalForPayment(orderId)
  return decidePaymentRoute({
    method,
    amountCents: moneyToAmountCents(total),
    pixMpMaxAmountCents,
  })
}