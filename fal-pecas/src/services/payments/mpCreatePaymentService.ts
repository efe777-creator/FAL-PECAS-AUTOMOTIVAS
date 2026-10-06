import { getSupabase } from '@/lib/supabase'

export interface CreateMercadoPagoPaymentResult {
  paymentId: string
  providerPaymentId?: string
  status: 'pending'
  orderId?: string
  amount?: number
  method?: string
  pixQrCode?: string | null
  pixQrCodeBase64?: string | null
  paymentUrl?: string | null
  expiresAt?: string | null
  reused?: boolean
  orderApproved?: false
}

/**
 * F9-B — invoca Edge create-mp-payment.
 * Body: somente { orderId }. Nunca amount/method.
 */
export async function createMercadoPagoPayment(
  orderId: string,
): Promise<CreateMercadoPagoPaymentResult> {
  const { data, error } = await getSupabase().functions.invoke('create-mp-payment', {
    body: { orderId },
  })
  if (error) throw error
  const row = data as CreateMercadoPagoPaymentResult & { error?: string }
  if (row?.error) throw new Error(row.error)
  if (!row?.paymentId) throw new Error('Resposta create-mp-payment inválida')
  return row
}
