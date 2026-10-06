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
  providerStatus?: string
}

export interface CreateMercadoPagoCardInput {
  token: string
  paymentMethodId: string
  installments: number
  issuerId?: string
  paymentTypeId?: string
}

/**
 * F9-B/D — invoca Edge create-mp-payment.
 * Pix: só orderId. Cartão: + token Brick (nunca amount).
 */
export async function createMercadoPagoPayment(
  orderId: string,
  card?: CreateMercadoPagoCardInput,
): Promise<CreateMercadoPagoPaymentResult> {
  const body: Record<string, unknown> = { orderId }
  if (card) {
    body.token = card.token
    body.paymentMethodId = card.paymentMethodId
    body.installments = card.installments
    if (card.issuerId) body.issuerId = card.issuerId
    if (card.paymentTypeId) body.paymentTypeId = card.paymentTypeId
  }
  const { data, error } = await getSupabase().functions.invoke('create-mp-payment', {
    body,
  })
  if (error) throw error
  const row = data as CreateMercadoPagoPaymentResult & { error?: string }
  if (row?.error) throw new Error(row.error)
  if (!row?.paymentId) throw new Error('Resposta create-mp-payment inválida')
  return row
}
