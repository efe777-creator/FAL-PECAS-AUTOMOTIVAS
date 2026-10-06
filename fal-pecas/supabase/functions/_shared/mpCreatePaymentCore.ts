/**
 * Cópia Deno do núcleo F9-B (espelha src/services/payments/mpCreatePaymentCore.ts).
 */

export type MpCreateMethod = 'pix' | 'credit_card' | 'debit_card'

export interface MpCreatePaymentRequestBody {
  orderId?: unknown
  amount?: unknown
  method?: unknown
  status?: unknown
  payment_method?: unknown
  provider_payment_id?: unknown
  external_reference?: unknown
  customer_id?: unknown
}

const FORBIDDEN = [
  'amount',
  'method',
  'status',
  'payment_method',
  'provider_payment_id',
  'external_reference',
  'customer_id',
] as const

export function parseCreateMpPaymentClientBody(body: MpCreatePaymentRequestBody): {
  orderId: string
} {
  for (const key of FORBIDDEN) {
    if ((body as Record<string, unknown>)[key] !== undefined && (body as Record<string, unknown>)[key] !== null) {
      throw new Error(`campo '${key}' não permitido no client; use somente orderId`)
    }
  }
  const orderId = typeof body.orderId === 'string' ? body.orderId.trim() : ''
  if (!orderId) throw new Error('orderId obrigatório')
  return { orderId }
}

export function serverPaymentMethod(): MpCreateMethod {
  return 'pix'
}

export function buildIdempotencyKey(paymentId: string): string {
  if (!paymentId) throw new Error('paymentId obrigatório para idempotency key')
  return `fal-pay-${paymentId}`
}

export function buildMpPaymentBody(input: {
  transactionAmount: number
  description: string
  paymentMethodId: MpCreateMethod
  externalReference: string
  payer: {
    email: string
    firstName?: string
    lastName?: string
    identificationType?: 'CPF' | 'CNPJ'
    identificationNumber?: string
  }
}): Record<string, unknown> {
  if (!(input.transactionAmount > 0)) throw new Error('transaction_amount inválido')
  const payer: Record<string, unknown> = { email: input.payer.email }
  if (input.payer.firstName) payer.first_name = input.payer.firstName
  if (input.payer.lastName) payer.last_name = input.payer.lastName
  if (input.payer.identificationType && input.payer.identificationNumber) {
    payer.identification = {
      type: input.payer.identificationType,
      number: input.payer.identificationNumber,
    }
  }
  return {
    transaction_amount: Math.round(input.transactionAmount * 100) / 100,
    description: input.description,
    payment_method_id: input.paymentMethodId,
    external_reference: input.externalReference,
    payer,
  }
}

export function mapMpResponseToPaymentFields(mp: {
  id?: number | string
  status?: string
  payment_method_id?: string
  point_of_interaction?: {
    transaction_data?: {
      qr_code?: string
      qr_code_base64?: string
      ticket_url?: string
    }
  }
  date_of_expiration?: string
}) {
  const td = mp.point_of_interaction?.transaction_data
  const id = mp.id != null ? String(mp.id) : ''
  if (!id) throw new Error('Resposta MP sem id')
  return {
    provider_payment_id: id,
    provider_status: mp.status ?? null,
    method: mp.payment_method_id ?? null,
    pix_qr_code: td?.qr_code ?? null,
    pix_qr_code_base64: td?.qr_code_base64 ?? null,
    payment_url: td?.ticket_url ?? null,
    expires_at: mp.date_of_expiration ?? null,
    status: 'pending' as const,
    orderApproved: false as const,
  }
}
