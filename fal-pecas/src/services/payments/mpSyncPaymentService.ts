import { getSupabase } from '@/lib/supabase'

export interface SyncMpPaymentResult {
  ok: boolean
  status?: string
  providerStatus?: string | null
  orderId?: string
  orderStatus?: string
  orderApproved?: boolean
  noop?: boolean
  reused?: boolean
  error?: string
}

/** Consulta MP via Edge e promove approved/rejected se o webhook atrasou. */
export async function syncMercadoPagoPayment(
  paymentId: string,
): Promise<SyncMpPaymentResult> {
  const { data, error } = await getSupabase().functions.invoke('sync-mp-payment', {
    body: { paymentId },
  })
  let body = data as SyncMpPaymentResult | null
  if (error && !body) {
    try {
      const ctx = (error as { context?: Response }).context
      if (ctx && typeof ctx.json === 'function') {
        body = (await ctx.json()) as SyncMpPaymentResult
      }
    } catch {
      // ignore
    }
  }
  if (error) {
    throw new Error(body?.error || error.message || 'Falha ao sincronizar pagamento')
  }
  if (body?.error) throw new Error(body.error)
  return body ?? { ok: false, error: 'empty_response' }
}
