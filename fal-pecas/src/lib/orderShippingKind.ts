export type OrderShippingKind = 'melhorenvio' | 'own' | 'mock' | 'unknown'

type ShipmentLike = {
  provider?: string | null
  service?: string | null
  carrier?: string | null
  metadata?: Record<string, unknown> | null
} | null | undefined

type OrderWithShipment = { shipment?: ShipmentLike }

/** Classifica frete do pedido pelo shipment.provider (place_order). */
export function orderShippingKind(order: OrderWithShipment): OrderShippingKind {
  const p = (order.shipment?.provider ?? '').toLowerCase()
  if (p.includes('melhorenvio')) return 'melhorenvio'
  if (p === 'own' || p.startsWith('own')) return 'own'
  if (p.includes('mock')) return 'mock'
  return 'unknown'
}

export function orderUsesMelhorEnvio(order: OrderWithShipment): boolean {
  return orderShippingKind(order) === 'melhorenvio'
}

/** Retirada na loja (mock:pickup / service pickup / metadata). */
export function isOrderStorePickup(order: OrderWithShipment): boolean {
  const s = order.shipment
  if (!s) return false
  const service = String(s.service ?? '').toLowerCase()
  const carrier = String(s.carrier ?? '').toLowerCase()
  if (service === 'pickup' || service.includes('retirada')) return true
  if (carrier.includes('retirada') || carrier.includes('pickup')) return true
  const meta = s.metadata
  if (meta && typeof meta === 'object') {
    const optionId = String(
      (meta as { option_id?: unknown }).option_id ??
        (meta as { optionId?: unknown }).optionId ??
        '',
    ).toLowerCase()
    if (optionId.includes('pickup') || optionId === 'mock:pickup') return true
    const kind = String(
      (meta as { kind?: unknown }).kind ??
        (meta as { shipping_kind?: unknown }).shipping_kind ??
        '',
    ).toLowerCase()
    if (kind === 'pickup' || kind === 'retirada') return true
  }
  return false
}
