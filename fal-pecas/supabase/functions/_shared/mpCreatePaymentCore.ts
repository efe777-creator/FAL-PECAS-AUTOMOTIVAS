/**
 * Núcleo puro create payment Mercado Pago (F9-B/C/D).
 * Amount sempre do servidor (orders.total). FE não envia amount.
 * Pix: body { orderId }. Cartão: + token + paymentMethodId + installments (Brick).
 */

export type MpCreateMethod = 'pix' | 'credit_card' | 'debit_card'

export interface MpCardClientFields {
  token: string
  paymentMethodId: string
  installments: number
  issuerId?: string
  paymentTypeId?: 'credit_card' | 'debit_card' | string
}

export interface MpCreatePaymentRequestBody {
  orderId?: unknown
  amount?: unknown
  method?: unknown
  status?: unknown
  payment_method?: unknown
  provider_payment_id?: unknown
  external_reference?: unknown
  customer_id?: unknown
  token?: unknown
  paymentMethodId?: unknown
  installments?: unknown
  issuerId?: unknown
  paymentTypeId?: unknown
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
  /** MP payment_method_id: pix | visa | master | … */
  paymentMethodId: string
  externalReference: string
  payer: MpPayerInput
  token?: string
  installments?: number
  issuerId?: string
}

const FORBIDDEN_CLIENT_KEYS = [
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
  card?: MpCardClientFields
} {
  for (const key of FORBIDDEN_CLIENT_KEYS) {
    if (body[key] !== undefined && body[key] !== null) {
      throw new Error(`campo '${key}' não permitido no client; use somente orderId (+ token cartão)`)
    }
  }
  const orderId = typeof body.orderId === 'string' ? body.orderId.trim() : ''
  if (!orderId) throw new Error('orderId obrigatório')

  const hasToken = body.token != null && String(body.token).trim() !== ''
  if (!hasToken) {
    return { orderId }
  }

  const token = String(body.token).trim()
  const paymentMethodId =
    typeof body.paymentMethodId === 'string' ? body.paymentMethodId.trim() : ''
  const installments = Number(body.installments)
  if (!paymentMethodId) throw new Error('paymentMethodId obrigatório para cartão')
  if (!Number.isFinite(installments) || installments < 1) {
    throw new Error('installments inválido')
  }
  const issuerId =
    body.issuerId != null && String(body.issuerId).trim() !== ''
      ? String(body.issuerId).trim()
      : undefined
  const paymentTypeId =
    body.paymentTypeId != null ? String(body.paymentTypeId).trim() : undefined

  return {
    orderId,
    card: { token, paymentMethodId, installments, issuerId, paymentTypeId },
  }
}

/** Método interno FAL a partir do fluxo (pix default; cartão via Brick). */
export function resolveInternalMethod(card?: MpCardClientFields): MpCreateMethod {
  if (!card) return 'pix'
  const t = (card.paymentTypeId ?? '').toLowerCase()
  if (t === 'debit_card' || t === 'debit') return 'debit_card'
  return 'credit_card'
}

/** @deprecated use resolveInternalMethod — Pix default F9-B */
export function serverPaymentMethod(): MpCreateMethod {
  return 'pix'
}

/** attempt > 1 após falha MP — evita cache de X-Idempotency-Key com erro antigo. */
export function buildIdempotencyKey(paymentId: string, attempt = 1): string {
  if (!paymentId) throw new Error('paymentId obrigatório para idempotency key')
  const n = Number.isFinite(attempt) && attempt >= 1 ? Math.floor(attempt) : 1
  return n <= 1 ? `fal-pay-${paymentId}` : `fal-pay-${paymentId}-a${n}`
}

/** TTL da cobrança Pix (QR). O pedido permanece até 48 h para nova tentativa. */
export const PIX_PAYMENT_TTL_MINUTES = 5

/** Pedido sem pagamento aprovado é cancelado/retirado da fila operacional após este prazo. */
export const UNPAID_ORDER_TTL_HOURS = 48

export function pixDateOfExpiration(from: Date = new Date()): string {
  return new Date(from.getTime() + PIX_PAYMENT_TTL_MINUTES * 60_000).toISOString()
}

export function isPaymentExpired(expiresAt: string | null | undefined, now: Date = new Date()): boolean {
  if (!expiresAt) return false
  const t = new Date(expiresAt).getTime()
  if (!Number.isFinite(t)) return false
  return t <= now.getTime()
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

  const body: Record<string, unknown> = {
    transaction_amount: Math.round(input.transactionAmount * 100) / 100,
    description: input.description,
    payment_method_id: input.paymentMethodId,
    external_reference: input.externalReference,
    payer,
  }

  if (input.token) {
    body.token = input.token
    body.installments = input.installments ?? 1
    if (input.issuerId) body.issuer_id = Number(input.issuerId) || input.issuerId
  } else if (input.paymentMethodId === 'pix') {
    body.date_of_expiration = pixDateOfExpiration()
  }

  return body
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

/**
 * Mapeia resposta MP → colunas FAL.
 * status interno SEMPRE pending na create (approve = webhook F9-C).
 */
export function mapMpResponseToPaymentFields(mp: MpPaymentApiResponse): {
  provider_payment_id: string
  provider_status: string | null
  method: string | null
  pix_qr_code: string | null
  pix_qr_code_base64: string | null
  payment_url: string | null
  expires_at: string | null
  status: 'pending'
  orderApproved: false
} {
  const td = mp.point_of_interaction?.transaction_data
  const id = mp.id != null ? String(mp.id) : ''
  if (!id) throw new Error('Resposta MP sem id')

  const isPix = (mp.payment_method_id ?? '').toLowerCase() === 'pix'
  return {
    provider_payment_id: id,
    provider_status: mp.status ?? null,
    method: mp.payment_method_id ?? null,
    pix_qr_code: td?.qr_code ?? null,
    pix_qr_code_base64: td?.qr_code_base64 ?? null,
    payment_url: td?.ticket_url ?? null,
    expires_at: mp.date_of_expiration ?? (isPix ? pixDateOfExpiration() : null),
    status: 'pending',
    orderApproved: false,
  }
}
