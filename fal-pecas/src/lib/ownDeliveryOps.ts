/**
 * Marcha 6 — frete próprio: saída → tentativa(s) → entrega.
 * Sem etiqueta ME. Mock fora. Pickup ≠ own.
 */

export type OwnDeparture = {
  at: string
  by?: string | null
  note?: string | null
}

export type OwnAttempt = {
  at: string
  by?: string | null
  note?: string | null
  outcome: 'failed' | 'rescheduled' | 'other'
}

export type OwnDeliveryOps = {
  departure: OwnDeparture | null
  attempts: OwnAttempt[]
  deliveredAt?: string | null
}

export function normalizeOwnProvider(p: string | null | undefined): string {
  return String(p ?? '')
    .trim()
    .toLowerCase()
    .replace(/_sandbox$/, '')
}

export function parseOwnDeliveryOps(
  metadata: Record<string, unknown> | null | undefined,
): OwnDeliveryOps {
  const raw = metadata?.own
  if (!raw || typeof raw !== 'object') {
    return { departure: null, attempts: [] }
  }
  const o = raw as Record<string, unknown>
  const dep = o.departure
  let departure: OwnDeparture | null = null
  if (dep && typeof dep === 'object') {
    const d = dep as Record<string, unknown>
    if (d.at) {
      departure = {
        at: String(d.at),
        by: d.by != null ? String(d.by) : null,
        note: d.note != null ? String(d.note) : null,
      }
    }
  }
  const attempts: OwnAttempt[] = []
  if (Array.isArray(o.attempts)) {
    for (const row of o.attempts) {
      if (!row || typeof row !== 'object') continue
      const a = row as Record<string, unknown>
      if (!a.at) continue
      const outcome = a.outcome === 'rescheduled' || a.outcome === 'other' ? a.outcome : 'failed'
      attempts.push({
        at: String(a.at),
        by: a.by != null ? String(a.by) : null,
        note: a.note != null ? String(a.note) : null,
        outcome,
      })
    }
  }
  return {
    departure,
    attempts,
    deliveredAt: o.deliveredAt != null ? String(o.deliveredAt) : null,
  }
}

export type OwnOpsGateInput = {
  orderStatus: string
  paymentStatus: string | null | undefined
  packingComplete?: boolean
  provider: string | null | undefined
  own?: OwnDeliveryOps | null
  orderCancelledOrRefunded?: boolean
}

export type OwnOpsGateResult = {
  ok: boolean
  blockers: string[]
  message?: string
}

function blockersMessage(blockers: string[]): string {
  const map: Record<string, string> = {
    order_not_operable: 'Pedido cancelado/reembolsado.',
    order_not_ready: 'Pedido ainda não pronto para saída.',
    payment_not_approved: 'Pagamento não aprovado (canônico).',
    packing_incomplete: 'Packing incompleto.',
    not_own_provider: 'Só frete próprio (own) — mock/ME fora desta jornada.',
    mock_bloqueado: 'Mock não usa ops reais de entrega própria.',
    not_enviado: 'Pedido precisa estar em trânsito (enviado) após a saída.',
    missing_departure: 'Registre a saída antes de confirmar entrega.',
  }
  return blockers.map((b) => map[b] ?? b).join(' ')
}

/** Saída = ship_order no caminho own. */
export function evaluateOwnDepartureGates(input: OwnOpsGateInput): OwnOpsGateResult {
  const blockers: string[] = []
  const provider = normalizeOwnProvider(input.provider)
  if (input.orderCancelledOrRefunded) blockers.push('order_not_operable')
  if (provider === 'mock') blockers.push('mock_bloqueado')
  if (provider !== 'own') blockers.push('not_own_provider')
  if (!['pronto_para_envio', 'preparando_envio'].includes(input.orderStatus)) {
    blockers.push('order_not_ready')
  }
  if (input.paymentStatus !== 'approved') blockers.push('payment_not_approved')
  if (!input.packingComplete) blockers.push('packing_incomplete')
  if (blockers.length) {
    return { ok: false, blockers, message: blockersMessage(blockers) }
  }
  return { ok: true, blockers: [] }
}

/** Confirmação de entrega ao cliente. */
export function evaluateOwnDeliverGates(input: OwnOpsGateInput): OwnOpsGateResult {
  const blockers: string[] = []
  const provider = normalizeOwnProvider(input.provider)
  if (input.orderCancelledOrRefunded) blockers.push('order_not_operable')
  if (provider === 'mock') blockers.push('mock_bloqueado')
  if (provider !== 'own') blockers.push('not_own_provider')
  if (input.orderStatus !== 'enviado') blockers.push('not_enviado')
  if (input.paymentStatus !== 'approved') blockers.push('payment_not_approved')
  if (!input.own?.departure) blockers.push('missing_departure')
  if (blockers.length) {
    return { ok: false, blockers, message: blockersMessage(blockers) }
  }
  return { ok: true, blockers: [] }
}

export type OwnNextAction =
  | 'aguardar_packing_ou_pagamento'
  | 'registrar_saida'
  | 'registrar_tentativa_ou_entrega'
  | 'entregue'
  | 'mock_bloqueado'
  | 'nao_own'
  | 'desconhecida'

export function nextOwnDeliveryAction(
  input: OwnOpsGateInput & { own: OwnDeliveryOps | null },
): OwnNextAction {
  const provider = normalizeOwnProvider(input.provider)
  if (provider === 'mock') return 'mock_bloqueado'
  if (provider !== 'own') return 'nao_own'
  if (input.orderStatus === 'entregue') return 'entregue'
  if (['pronto_para_envio', 'preparando_envio'].includes(input.orderStatus)) {
    if (input.paymentStatus !== 'approved' || !input.packingComplete) {
      return 'aguardar_packing_ou_pagamento'
    }
    return 'registrar_saida'
  }
  if (input.orderStatus === 'enviado') return 'registrar_tentativa_ou_entrega'
  return 'desconhecida'
}
