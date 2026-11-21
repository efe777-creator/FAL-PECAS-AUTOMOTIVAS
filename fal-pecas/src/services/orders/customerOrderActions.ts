import { getSupabase } from '@/lib/supabase'

export type CustomerDecisionChoice =
  | 'continue_available'
  | 'wait_arrival'
  | 'cancel_order'
  | 'authorize'
  | 'reject'

export type CustomerDecisionResponse = {
  order_id: string
  status: string
  customer_decision:
    | 'authorized'
    | 'rejected'
    | 'continue_available'
    | 'wait_arrival'
    | 'cancel_order'
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
  decision: CustomerDecisionChoice,
  reason?: string,
): Promise<CustomerDecisionResponse> {
  const trimmed = reason?.trim() || null
  if ((decision === 'reject' || decision === 'cancel_order') && !trimmed) {
    throw new Error('Informe o motivo do cancelamento')
  }
  const { data, error } = await getSupabase().rpc('customer_respond_order_decision', {
    p_order_id: orderId,
    p_decision: decision,
    p_reason: trimmed,
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

export async function customerConfirmReceipt(
  orderId: string,
): Promise<{ order_id: string; already?: boolean }> {
  const { data, error } = await getSupabase().rpc('customer_confirm_receipt', {
    p_order_id: orderId,
  })
  if (error) throw error
  return data as { order_id: string; already?: boolean }
}

export type ReportDeliveryIssueInput = {
  reason: string
  motivoCode: string
  scope: 'order' | 'items'
  items?: { order_item_id: string; qty: number }[]
  policyAck?: boolean
}

export async function customerReportDeliveryIssue(
  orderId: string,
  input: ReportDeliveryIssueInput | string,
): Promise<{ order_id: string; occurrence_id: string; tipo?: string }> {
  const normalized: ReportDeliveryIssueInput =
    typeof input === 'string'
      ? { reason: input, motivoCode: 'outro_suporte', scope: 'order', policyAck: false }
      : input
  const trimmed = normalized.reason.trim()
  if (!trimmed) throw new Error('Informe o problema')
  const { data, error } = await getSupabase().rpc('customer_report_delivery_issue', {
    p_order_id: orderId,
    p_reason: trimmed,
    p_motivo_code: normalized.motivoCode,
    p_scope: normalized.scope,
    p_items: normalized.items ?? [],
    p_policy_ack: Boolean(normalized.policyAck),
  })
  if (error) throw error
  return data as { order_id: string; occurrence_id: string; tipo?: string }
}
