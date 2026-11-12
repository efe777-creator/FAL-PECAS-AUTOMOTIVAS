/**
 * Marcha 4 — gates de compra de etiqueta Melhor Envio.
 * Fonte canônica de pagamento: payments.status === 'approved'.
 * Packing: order_packing_is_complete (estrutural + alocação).
 */

import {
  alreadyPurchased,
  evaluateFreightDivergence,
  type MeLabelState,
} from '@/lib/melhorEnvioLabelState'

export type MePurchaseGateInput = {
  orderStatus: string
  labelState: MeLabelState
  paymentStatus: string | null | undefined
  packingComplete: boolean
  /** cancelado / reembolsado / fora de ops */
  orderCancelledOrRefunded?: boolean
}

export type MePurchaseGateResult = {
  ok: boolean
  alreadyPurchased: boolean
  blockers: string[]
  message?: string
}

const READY = new Set(['pronto_para_envio', 'preparando_envio'])

export function evaluateMePurchaseGates(input: MePurchaseGateInput): MePurchaseGateResult {
  if (alreadyPurchased(input.labelState)) {
    return { ok: true, alreadyPurchased: true, blockers: [], message: 'Compra já registrada.' }
  }

  const blockers: string[] = []

  if (input.orderCancelledOrRefunded) blockers.push('order_not_operable')
  if (!READY.has(input.orderStatus)) blockers.push('order_not_ready')
  if (input.paymentStatus !== 'approved') blockers.push('payment_not_approved')
  if (!input.packingComplete) blockers.push('packing_incomplete')

  const prePurchase =
    input.labelState === 'none' ||
    input.labelState === 'quoted' ||
    input.labelState === 'prepared' ||
    input.labelState === 'cart'
  if (!prePurchase) blockers.push('label_state_not_purchasable')

  if (blockers.length) {
    return {
      ok: false,
      alreadyPurchased: false,
      blockers,
      message: blockersMessage(blockers),
    }
  }

  return { ok: true, alreadyPurchased: false, blockers: [] }
}

function blockersMessage(blockers: string[]): string {
  const map: Record<string, string> = {
    order_not_operable: 'Pedido cancelado/reembolsado — compra bloqueada.',
    order_not_ready: 'Pedido ainda não está pronto para etiqueta.',
    payment_not_approved: 'Pagamento não aprovado (fonte canônica payments).',
    packing_incomplete: 'Packing incompleto — aloque itens aos volumes antes.',
    label_state_not_purchasable: 'Estado da etiqueta não permite compra.',
  }
  return blockers.map((b) => map[b] ?? b).join(' ')
}

export type DivergenceOverride = {
  confirm: boolean
  reason: string
}

export function resolveFreightDivergenceForPurchase(input: {
  chargedShipping: number
  labelAmount: number
  override?: DivergenceOverride | null
}): {
  blocked: boolean
  overrideApplied: boolean
  divergence: ReturnType<typeof evaluateFreightDivergence>
  reason: string
} {
  const divergence = evaluateFreightDivergence({
    chargedShipping: input.chargedShipping,
    labelAmount: input.labelAmount,
  })
  if (!divergence.blocked) {
    return { blocked: false, overrideApplied: false, divergence, reason: divergence.reason }
  }
  const ov = input.override
  if (ov?.confirm === true && String(ov.reason ?? '').trim()) {
    return {
      blocked: false,
      overrideApplied: true,
      divergence: { ...divergence, blocked: false, reason: `Override: ${ov.reason.trim()}` },
      reason: ov.reason.trim(),
    }
  }
  return {
    blocked: true,
    overrideApplied: false,
    divergence,
    reason: divergence.reason,
  }
}
