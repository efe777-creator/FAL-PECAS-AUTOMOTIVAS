/**
 * Marcha 5 — postagem/coleta ≠ label_state.
 * Etiqueta purchased/generated/printed NÃO marca pedido como enviado.
 * ship_order é o único caminho para status enviado.
 */

import { alreadyPurchased, type MeLabelState } from '@/lib/melhorEnvioLabelState'
import { orderStatusLabel } from '@/lib/orderLifecycle'

export type ShipOrderGateInput = {
  orderStatus: string
  paymentStatus: string | null | undefined
  packingComplete: boolean
  provider: string | null | undefined
  labelState: MeLabelState
  orderCancelledOrRefunded?: boolean
}

export type ShipOrderGateResult = {
  ok: boolean
  blockers: string[]
  message?: string
}

const READY = new Set(['pronto_para_envio', 'preparando_envio'])

function normalizeProvider(p: string | null | undefined): string {
  return String(p ?? '')
    .trim()
    .toLowerCase()
    .replace(/_sandbox$/, '')
}

export function evaluateShipOrderGates(input: ShipOrderGateInput): ShipOrderGateResult {
  const blockers: string[] = []
  if (input.orderCancelledOrRefunded) blockers.push('order_not_operable')
  if (!READY.has(input.orderStatus)) blockers.push('order_not_ready')
  if (input.paymentStatus !== 'approved') blockers.push('payment_not_approved')
  if (!input.packingComplete) blockers.push('packing_incomplete')

  const provider = normalizeProvider(input.provider)
  if (provider === 'melhorenvio' && !alreadyPurchased(input.labelState)) {
    blockers.push('me_label_not_purchased')
  }
  if (provider === 'mock') blockers.push('mock_not_shippable')

  if (blockers.length) {
    const map: Record<string, string> = {
      order_not_operable: 'Pedido cancelado/reembolsado.',
      order_not_ready: 'Pedido ainda não pronto para postagem.',
      payment_not_approved: 'Pagamento não aprovado.',
      packing_incomplete: 'Packing incompleto.',
      me_label_not_purchased: 'Compre/gere a etiqueta Melhor Envio antes da postagem.',
      mock_not_shippable: 'Mock não usa postagem real.',
    }
    return {
      ok: false,
      blockers,
      message: blockers.map((b) => map[b] ?? b).join(' '),
    }
  }
  return { ok: true, blockers: [] }
}

/** Copy cliente: nunca tratar label impressa como enviado. */
export function customerFacingShipCopy(
  orderStatus: string,
  _labelState?: MeLabelState | null,
): string {
  return orderStatusLabel[orderStatus] ?? orderStatus
}
