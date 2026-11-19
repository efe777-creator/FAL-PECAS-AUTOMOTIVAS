/**
 * Registry de blocos do OrderOpsSurface (I5).
 * Onda 2 registra packing/ownShip/meFreight sem fork do surface.
 */

import type { OrderOpsBlockId } from '@/lib/orderOpsSurfacePolicy'

export const ORDER_OPS_BLOCK_REGISTRY_WAVE1: readonly OrderOpsBlockId[] = [
  'actionRail',
  'analysisPanel',
  'itemsConferencia',
  'itemsSeparacaoPiso',
  'itemsInlineOps',
  'paymentBlock',
  'history',
  'wave2Placeholder',
] as const

/** Reservados — componentes plugados na onda 2. */
export const ORDER_OPS_BLOCK_REGISTRY_WAVE2_PENDING: readonly OrderOpsBlockId[] = [
  'packing',
  'ownShip',
  'meFreight',
] as const

export function isWave1Block(id: OrderOpsBlockId): boolean {
  return (ORDER_OPS_BLOCK_REGISTRY_WAVE1 as readonly string[]).includes(id)
}

export function isWave2PendingBlock(id: OrderOpsBlockId): boolean {
  return (ORDER_OPS_BLOCK_REGISTRY_WAVE2_PENDING as readonly string[]).includes(id)
}
