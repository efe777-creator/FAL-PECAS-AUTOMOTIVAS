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
}

/**
 * F9-B — invoca Edge create-mp-payment.
 * Envia somente orderId (+ method opcional). Nunca amount.
 */
export async function createMercadoPagoPayment(
  orderId: string,
  method: 'pix' | 'credit_card' | 'debit_card' = 'pix',
): Promise<CreateMercadoPagoPaymentResult> {
  const { data, error } = await getSupabase().functions.invoke('create-mp-payment', {
    body: { orderId, method },
  })
  if (error) throw error
  const row = data as CreateMercadoPagoPaymentResult & { error?: string }
  if (row?.error) throw new Error(row.error)
  if (!row?.paymentId) throw new Error('Resposta create-mp-payment inválida')
  return row
}
