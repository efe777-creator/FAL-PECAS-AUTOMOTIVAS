import { getSupabase } from '@/lib/supabase'

export type CustomerDecisionResponse = {
  order_id: string
  status: string
  customer_decision: 'authorized' | 'rejected'
}

export type CustomerCancelUnpaidResponse = {
  order_id: string
  status: string
  reason: string
}

export async function customerCancelUnpaidOrder(
  orderId: string,
): Promise<CustomerCancelUnpaidResponse> {
  const { data, error } = await getSupabase().rpc('customer_cancel_unpaid_order', {
    p_order_id: orderId,
  })
  if (error) throw error
  return data as CustomerCancelUnpaidResponse
}

export async function customerRespondOrderDecision(
  orderId: string,
  decision: 'authorize' | 'reject',
): Promise<CustomerDecisionResponse> {
  const { data, error } = await getSupabase().rpc('customer_respond_order_decision', {
    p_order_id: orderId,
    p_decision: decision,
  })
  if (error) throw error
  return data as CustomerDecisionResponse
}

export type RequestCancellationResponse = {
  order_id: string
  status: string
  cancellation_request: 'pending'
  refund_policy: 'manual'
}

export async function requestOrderCancellation(
  orderId: string,
  reason?: string,
): Promise<RequestCancellationResponse> {
  const { data, error } = await getSupabase().rpc('request_order_cancellation', {
    p_order_id: orderId,
    p_reason: reason?.trim() ? reason.trim() : null,
  })
  if (error) throw error
  return data as RequestCancellationResponse
}
