/**
 * PG07 — estados padronizados FAL (motor).
 * Persistência atual (`payments.status` CHECK) ainda não inclui todos;
 * use `toPersistedPaymentStatus` ao gravar até migration PG08.
 */

/** Estados canônicos do motor (alvo plano mestre). */
export type FalPaymentStatus =
  | 'created'
  | 'pending'
  | 'authorized'
  | 'approved'
  | 'rejected'
  | 'cancelled'
  | 'refunded'
  | 'partially_refunded'
  | 'in_process'
  | 'expired'
  | 'failed'

/** Valores aceitos hoje pelo CHECK em public.payments. */
export type PersistedPaymentStatus =
  | 'created'
  | 'pending'
  | 'approved'
  | 'rejected'
  | 'failed'
  | 'cancelled'
  | 'expired'
  | 'refunded'

const PERSISTED = new Set<string>([
  'created',
  'pending',
  'approved',
  'rejected',
  'failed',
  'cancelled',
  'expired',
  'refunded',
])

/** Mapeia status do motor → coluna payments.status atual. */
export function toPersistedPaymentStatus(status: FalPaymentStatus): PersistedPaymentStatus {
  if (status === 'authorized' || status === 'in_process') return 'pending'
  if (status === 'partially_refunded') return 'refunded'
  if (PERSISTED.has(status)) return status as PersistedPaymentStatus
  return 'pending'
}

/** Normaliza string desconhecida → estado FAL (conservador). */
export function normalizeFalPaymentStatus(raw: string | null | undefined): FalPaymentStatus {
  const s = (raw ?? '').trim().toLowerCase()
  const known: FalPaymentStatus[] = [
    'created',
    'pending',
    'authorized',
    'approved',
    'rejected',
    'cancelled',
    'refunded',
    'partially_refunded',
    'in_process',
    'expired',
    'failed',
  ]
  if ((known as string[]).includes(s)) return s as FalPaymentStatus
  return 'pending'
}

/**
 * Status do provedor (ex. Mercado Pago) → estado FAL.
 * Preservar o original em `provider_status` na linha payments.
 */
export function mapProviderStatusToFal(
  provider: string,
  providerStatus: string | null | undefined,
): FalPaymentStatus {
  const p = provider.trim().toLowerCase()
  const s = (providerStatus ?? '').trim().toLowerCase()
  if (p === 'mercadopago' || p === 'mp') {
    if (s === 'approved') return 'approved'
    if (s === 'authorized') return 'authorized'
    if (s === 'in_process' || s === 'in_mediation') return 'in_process'
    if (s === 'rejected' || s === 'charged_back') return 'rejected'
    if (s === 'cancelled') return 'cancelled'
    if (s === 'refunded') return 'refunded'
    if (s === 'partially_refunded') return 'partially_refunded'
    if (s === 'expired') return 'expired'
    if (s === 'pending' || s === 'pending_contingency' || s === 'pending_review_manual') {
      return 'pending'
    }
  }
  return normalizeFalPaymentStatus(s)
}

export function isTerminalFalStatus(status: FalPaymentStatus): boolean {
  return (
    status === 'approved' ||
    status === 'rejected' ||
    status === 'cancelled' ||
    status === 'expired' ||
    status === 'refunded' ||
    status === 'partially_refunded' ||
    status === 'failed'
  )
}
