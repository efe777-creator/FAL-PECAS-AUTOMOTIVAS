/**
 * Núcleo mínimo para create-asaas-payment (PIX; sem Brick MP).
 * Mantém parse/TTL alinhado a mpCreatePaymentCore sem puxar o bundle MP inteiro.
 */

const FORBIDDEN_CLIENT_KEYS = [
  'amount',
  'method',
  'status',
  'payment_method',
  'provider_payment_id',
  'external_reference',
  'customer_id',
] as const

export function parseCreateMpPaymentClientBody(body: Record<string, unknown>): {
  orderId: string
  card?: undefined
} {
  for (const key of FORBIDDEN_CLIENT_KEYS) {
    if (body[key] !== undefined && body[key] !== null) {
      throw new Error(`campo '${key}' não permitido no client; use somente orderId`)
    }
  }
  const orderId = typeof body.orderId === 'string' ? body.orderId.trim() : ''
  if (!orderId) throw new Error('orderId obrigatório')
  if (body.token != null && String(body.token).trim() !== '') {
    throw new Error('cartão Asaas em implementação')
  }
  return { orderId }
}

export function resolveInternalMethod(_card?: undefined): 'pix' {
  return 'pix'
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