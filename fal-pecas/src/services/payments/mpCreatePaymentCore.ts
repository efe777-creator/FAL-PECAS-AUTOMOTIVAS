/**
 * Núcleo puro F9-B — create payment Mercado Pago (testável sem Deno/Edge).
 * Fonte de verdade do amount: sempre server (order.total). FE não dita valor.
 */

export type MpCreateMethod = 'pix' | 'credit_card' | 'debit_card'

export interface MpCreatePaymentRequestBody {
  orderId?: unknown
  amount?: unknown
  method?: unknown
}

export interface MpPayerInput {
  email: string
  firstName?: string
  lastName?: string
  identificationType?: 'CPF' | 'CNPJ'
  identificationNumber?: string
}

export interface BuildMpPaymentBodyInput {
  transactionAmount: number
  description: string
  paymentMethodId: MpCreateMethod
  externalReference: string
  payer: MpPayerInput
}

/** Rejeita amount vindo do client — só orderId (+ method opcional). */
export function parseCreateMpPaymentClientBody(body: MpCreatePaymentRequestBody): {
  orderId: string
  method: MpCreateMethod
} {
  if (body.amount !== undefined && body.amount !== null) {
    throw new Error('amount não pode ser enviado pelo client; use total do pedido no servidor')
  }
  const orderId = typeof body.orderId === 'string' ? body.orderId.trim() : ''
  if (!orderId) throw new Error('orderId obrigatório')

  const raw = typeof body.method === 'string' ? body.method.toLowerCase() : 'pix'
  const method: MpCreateMethod =
    raw === 'credit_card' || raw === 'debit_card' || raw === 'pix' ? raw : 'pix'

  return { orderId, method }
}

export function buildIdempotencyKey(paymentId: string): string {
  if (!paymentId) throw new Error('paymentId obrigatório para idempotency key')
  return `fal-pay-${paymentId}`
}

/** Payload POST /v1/payments — sem Access Token. */
export function buildMpPaymentBody(input: BuildMpPaymentBodyInput): Record<string, unknown> {
  if (!(input.transactionAmount > 0)) {
    throw new Error('transaction_amount inválido')
  }
  const payer: Record<string, unknown> = {
    email: input.payer.email,
  }
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

export interface MpPaymentApiResponse {
  id?: number | string
  status?: string
  status_detail?: string
  payment_method_id?: string
  point_of_interaction?: {
    transaction_data?: {
      qr_code?: string
      qr_code_base64?: string
      ticket_url?: string
    }
  }
  date_of_expiration?: string
}

/** Mapeia resposta MP → colunas FAL (sempre pending interno até webhook). */
export function mapMpResponseToPaymentFields(mp: MpPaymentApiResponse): {
  provider_payment_id: string
  provider_status: string | null
  method: string | null
  pix_qr_code: string | null
  pix_qr_code_base64: string | null
  payment_url: string | null
  expires_at: string | null
  status: 'pending'
} {
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
    status: 'pending',
  }
}
