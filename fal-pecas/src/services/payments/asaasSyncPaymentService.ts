import { getSupabase } from '@/lib/supabase'
import type { SyncMpPaymentResult } from '@/services/payments/mpSyncPaymentService'

export async function syncAsaasPayment(paymentId: string): Promise<SyncMpPaymentResult> {
  const { data, error } = await getSupabase().functions.invoke('sync-asaas-payment', {
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
    throw new Error(body?.error || error.message || 'Falha ao sincronizar pagamento Asaas')
  }
  if (body?.error) throw new Error(body.error)
  return body ?? { ok: false, error: 'empty_response' }
}