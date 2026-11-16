/**
 * Reconcile Asaas por externalReference + fases de cobrança (metadata).
 * Evita segundo POST após timeout/inconclusive.
 */

export type AsaasChargePhase = 'stub' | 'creating' | 'gateway' | 'inconclusive'

/** Lock anti-concorrência enquanto POST Asaas está em voo. */
export const ASAAS_CREATING_LOCK_MS = 45_000

export type AsaasRemotePayment = {
  id?: string
  status?: string
  value?: number
  totalValue?: number
  billingType?: string
  invoiceUrl?: string
  bankSlipUrl?: string
  deleted?: boolean
  externalReference?: string
  installmentCount?: number | null
}

const ACTIVE_STATUSES = new Set([
  'PENDING',
  'RECEIVED',
  'CONFIRMED',
  'RECEIVED_IN_CASH',
  'AWAITING_RISK_ANALYSIS',
  'OVERDUE',
])

export function readChargePhase(
  metadata: Record<string, unknown> | null | undefined,
): AsaasChargePhase | null {
  const raw = metadata?.charge_phase
  if (raw === 'stub' || raw === 'creating' || raw === 'gateway' || raw === 'inconclusive') {
    return raw
  }
  return null
}

export function withChargePhase(
  metadata: Record<string, unknown> | null | undefined,
  phase: AsaasChargePhase,
  extra?: Record<string, unknown>,
): Record<string, unknown> {
  return {
    ...(metadata ?? {}),
    ...(extra ?? {}),
    charge_phase: phase,
    charge_phase_at: new Date().toISOString(),
  }
}

export function isCreatingLockActive(
  metadata: Record<string, unknown> | null | undefined,
  now: Date = new Date(),
  lockMs: number = ASAAS_CREATING_LOCK_MS,
): boolean {
  if (readChargePhase(metadata) !== 'creating') return false
  const at = metadata?.charge_phase_at
  if (typeof at !== 'string' || !at) return true
  const t = new Date(at).getTime()
  if (!Number.isFinite(t)) return true
  return now.getTime() - t < lockMs
}

function remoteAmount(p: AsaasRemotePayment): number {
  const v = Number(p.value ?? p.totalValue ?? 0)
  return Number.isFinite(v) ? v : 0
}

function amountsMatch(a: number, b: number, eps = 0.02): boolean {
  return Math.abs(a - b) <= eps
}

/**
 * Escolhe cobrança remota reutilizável para o pedido (não deletada, status ativo,
 * billingType + valor alinhados). Prefere PENDING, depois mais recente na lista.
 */
export function pickReconcileCandidate(
  list: AsaasRemotePayment[] | null | undefined,
  opts: {
    amount: number
    billingType: string
    installments?: number
  },
): AsaasRemotePayment | null {
  const rows = (list ?? []).filter((p) => {
    if (!p?.id || p.deleted === true) return false
    const st = String(p.status ?? '').toUpperCase()
    if (st && !ACTIVE_STATUSES.has(st)) return false
    if (String(p.billingType ?? '').toUpperCase() !== opts.billingType.toUpperCase()) return false
    if (!amountsMatch(remoteAmount(p), opts.amount)) return false
    if (opts.billingType === 'CREDIT_CARD' && opts.installments != null && opts.installments > 1) {
      const remoteInst = Math.max(1, Math.floor(Number(p.installmentCount) || 1))
      if (remoteInst !== opts.installments) return false
    }
    return true
  })
  if (!rows.length) return null
  const pending = rows.find((p) => String(p.status ?? '').toUpperCase() === 'PENDING')
  return pending ?? rows[0] ?? null
}

export function asaasListPaymentsPath(externalReference: string, limit = 20): string {
  const ref = encodeURIComponent(externalReference)
  const lim = Math.min(100, Math.max(1, Math.floor(limit)))
  return `/payments?externalReference=${ref}&limit=${lim}`
}
