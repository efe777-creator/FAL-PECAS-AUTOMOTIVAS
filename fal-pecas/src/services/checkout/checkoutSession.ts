/**
 * AJUSTE-035 C2 — contexto de checkout em sessionStorage.
 * Não é fonte de verdade: no resume, sempre revalidar no servidor.
 */

const KEY = 'fal.checkoutSession.v1'
const IDEM_KEY = 'fal.checkoutIdempotency.v1'

const memory = new Map<string, string>()

function storageGet(key: string): string | null {
  try {
    if (typeof sessionStorage !== 'undefined') {
      return sessionStorage.getItem(key)
    }
  } catch {
    /* private mode */
  }
  return memory.get(key) ?? null
}

function storageSet(key: string, value: string): void {
  memory.set(key, value)
  try {
    if (typeof sessionStorage !== 'undefined') {
      sessionStorage.setItem(key, value)
    }
  } catch {
    /* memory only */
  }
}

function storageRemove(key: string): void {
  memory.delete(key)
  try {
    if (typeof sessionStorage !== 'undefined') {
      sessionStorage.removeItem(key)
    }
  } catch {
    /* ignore */
  }
}

export type CheckoutSessionChannel = 'pix' | 'card'

export type CheckoutSessionContext = {
  orderId: string
  paymentId?: string
  idempotencyKey: string
  channel?: CheckoutSessionChannel
  amount?: number
  savedAt: string
}

export function loadCheckoutIdempotencyKey(): string {
  const existing = storageGet(IDEM_KEY)
  if (existing && existing.length >= 32) return existing
  const next = crypto.randomUUID()
  storageSet(IDEM_KEY, next)
  return next
}

export function clearCheckoutIdempotencyKey(): void {
  storageRemove(IDEM_KEY)
}

export function saveCheckoutSession(ctx: Omit<CheckoutSessionContext, 'savedAt'>): void {
  const payload: CheckoutSessionContext = {
    ...ctx,
    savedAt: new Date().toISOString(),
  }
  storageSet(KEY, JSON.stringify(payload))
}

export function loadCheckoutSession(): CheckoutSessionContext | null {
  try {
    const raw = storageGet(KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as CheckoutSessionContext
    if (!parsed?.orderId || !parsed?.idempotencyKey) return null
    return parsed
  } catch {
    return null
  }
}

export function clearCheckoutSession(): void {
  storageRemove(KEY)
}
