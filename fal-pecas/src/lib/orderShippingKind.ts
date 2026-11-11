import type { AdminOrderDetail } from '@/services/admin/adminOrderService'

export type OrderShippingKind = 'melhorenvio' | 'own' | 'mock' | 'unknown'

/** Classifica frete do pedido pelo shipment.provider (place_order). */
export function orderShippingKind(order: Pick<AdminOrderDetail, 'shipment'>): OrderShippingKind {
  const p = (order.shipment?.provider ?? '').toLowerCase()
  if (p.includes('melhorenvio')) return 'melhorenvio'
  if (p === 'own' || p.startsWith('own')) return 'own'
  if (p.includes('mock')) return 'mock'
  return 'unknown'
}

export function orderUsesMelhorEnvio(order: Pick<AdminOrderDetail, 'shipment'>): boolean {
  return orderShippingKind(order) === 'melhorenvio'
}
