import { getSupabase } from '@/lib/supabase'

export interface OwnPaymentRow {
  id: string
  orderId: string
  status: string
  provider: string
  providerStatus: string | null
  amount: number
  method: string | null
  pixQrCode: string | null
  pixQrCodeBase64: string | null
  paymentUrl: string | null
  expiresAt: string | null
}

/** SELECT próprio (RLS) — poll pós create-mp-payment. Nunca seta approved no FE. */
export async function getOwnPayment(paymentId: string): Promise<OwnPaymentRow | null> {
  const { data, error } = await getSupabase()
    .from('payments')
    .select(
      'id, order_id, status, provider, provider_status, amount, method, pix_qr_code, pix_qr_code_base64, payment_url, expires_at',
    )
    .eq('id', paymentId)
    .maybeSingle()
  if (error) throw error
  if (!data) return null
  return {
    id: data.id,
    orderId: data.order_id,
    status: data.status,
    provider: data.provider,
    providerStatus: data.provider_status,
    amount: Number(data.amount),
    method: data.method,
    pixQrCode: data.pix_qr_code,
    pixQrCodeBase64: data.pix_qr_code_base64,
    paymentUrl: data.payment_url,
    expiresAt: data.expires_at,
  }
}
