/**
 * Parse do client para create-asaas-payment (PIX + cartão via invoiceUrl).
 * Sem PAN/CVV — cartão na página segura do provedor.
 */

const FORBIDDEN_CLIENT_KEYS = [
  'amount',
  'status',
  'payment_method',
  'provider_payment_id',
  'external_reference',
  'customer_id',
  'token',
  'creditCard',
  'creditCardHolderInfo',
  'creditCardToken',
] as const

export type AsaasRoutableMethod = 'pix' | 'credit_card' | 'debit_card'

export function parseAsaasCreateClientBody(body: Record<string, unknown>): {
  orderId: string
  method: AsaasRoutableMethod
  installments: number
} {
  for (const key of FORBIDDEN_CLIENT_KEYS) {
    if (body[key] !== undefined && body[key] !== null) {
      throw new Error(`campo '${key}' não permitido no client`)
    }
  }
  const orderId = typeof body.orderId === 'string' ? body.orderId.trim() : ''
  if (!orderId) throw new Error('orderId obrigatório')

  const rawMethod = String(body.method ?? 'pix').trim().toLowerCase()
  let method: AsaasRoutableMethod = 'pix'
  if (rawMethod === 'credit_card' || rawMethod === 'credit') method = 'credit_card'
  else if (rawMethod === 'debit_card' || rawMethod === 'debit') method = 'debit_card'
  else if (rawMethod === 'pix') method = 'pix'
  else throw new Error('method inválido')

  let installments = 1
  if (body.installments !== undefined && body.installments !== null) {
    installments = Math.floor(Number(body.installments))
    if (!Number.isFinite(installments) || installments < 1) {
      throw new Error('installments inválido')
    }
  }
  if (method === 'debit_card') installments = 1

  return { orderId, method, installments }
}

export const PIX_PAYMENT_TTL_MINUTES = 30

export function pixDateOfExpiration(from: Date = new Date()): string {
  return new Date(from.getTime() + PIX_PAYMENT_TTL_MINUTES * 60_000).toISOString()
}

export function isPaymentExpired(expiresAt: string | null | undefined, now: Date = new Date()): boolean {
  if (!expiresAt) return false
  const t = new Date(expiresAt).getTime()
  if (!Number.isFinite(t)) return false
  return t <= now.getTime()
}

export function clientRemoteIp(headers: Headers): string {
  const fwd = headers.get('x-forwarded-for')
  if (fwd) {
    const first = fwd.split(',')[0]?.trim()
    if (first) return first
  }
  const real = headers.get('x-real-ip')?.trim()
  if (real) return real
  const cf = headers.get('cf-connecting-ip')?.trim()
  if (cf) return cf
  return '127.0.0.1'
}