import { getSupabase } from '@/lib/supabase'

export type TransitionOrderInput = {
  orderId: string
  toStatus: string
  note?: string | null
  eventType?: string | null
  eventVisibility?: 'internal' | 'customer'
  payload?: Record<string, unknown>
}

/** Transição canônica de status (staff). UI nunca faz update direto. */
export async function transitionOrderStatus(input: TransitionOrderInput): Promise<{
  orderId: string
  from: string
  to: string
}> {
  const { data, error } = await getSupabase().rpc('transition_order_status', {
    p_order_id: input.orderId,
    p_to_status: input.toStatus,
    p_note: input.note ?? null,
    p_event_type: input.eventType ?? null,
    p_event_visibility: input.eventVisibility ?? 'internal',
    p_payload: input.payload ?? {},
  })
  if (error) throw error
  const row = data as { order_id?: string; from?: string; to?: string }
  return {
    orderId: String(row.order_id ?? input.orderId),
    from: String(row.from ?? ''),
    to: String(row.to ?? input.toStatus),
  }
}
