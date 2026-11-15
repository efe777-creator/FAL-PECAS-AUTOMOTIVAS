/** Status Asaas v3 → ação interna (sync/webhook). */

const APPROVE = new Set([
  'RECEIVED',
  'CONFIRMED',
  'RECEIVED_IN_CASH',
])

const REJECT = new Set([
  'REFUNDED',
  'REFUND_REQUESTED',
  'CHARGEBACK_REQUESTED',
  'CHARGEBACK_DISPUTE',
  'AWAITING_CHARGEBACK_REVERSAL',
  'DUNNING_RECEIVED',
  'DUNNING_REQUESTED',
])

export function asaasStatusToInternal(providerStatus: string | null | undefined): 'approve' | 'reject' | 'pending' {
  const s = (providerStatus ?? '').toUpperCase()
  if (!s) return 'pending'
  if (APPROVE.has(s)) return 'approve'
  if (REJECT.has(s)) return 'reject'
  return 'pending'
}