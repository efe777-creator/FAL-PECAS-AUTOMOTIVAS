import {
  contractedShippingShortLine,
  readContractedShipping,
} from '@/lib/contractedShipping'
import { isOrderStorePickup } from '@/lib/orderShippingKind'
import { isStorePickupAuthorized } from '@/lib/storePickupOps'
import { getSupabase } from '@/lib/supabase'
import { getCurrentCustomerId } from '@/services/customers/customerService'
import type { CustomerOrderSummary } from '@/types'

/** Quantidade de pedidos do cliente (1º pedido = 0). */
export async function countMyOrders(): Promise<number> {
  const customerId = await getCurrentCustomerId()
  if (!customerId) return 0
  const { count, error } = await getSupabase()
    .from('orders')
    .select('id', { count: 'exact', head: true })
    .eq('customer_id', customerId)
  if (error) throw error
  return count ?? 0
}

export async function listMyOrders(): Promise<CustomerOrderSummary[]> {
  const customerId = await getCurrentCustomerId()
  if (!customerId) return []

  const { data, error } = await getSupabase()
    .from('orders')
    .select(
      `
      id, status, total, created_at, shipping_amount,
      order_items ( id ),
      shipments ( provider, metadata, carrier, service, amount )
    `,
    )
    .eq('customer_id', customerId)
    .order('created_at', { ascending: false })
  if (error) throw error

  return (data ?? []).map((o) => {
    const items = o.order_items as unknown
    const count = Array.isArray(items) ? items.length : 0
    const ships = o.shipments as
      | {
          provider?: string
          metadata?: Record<string, unknown>
          carrier?: string
          service?: string
          amount?: number
        }[]
      | null
    const ship = Array.isArray(ships) ? ships[0] : null
    const shipmentLite = ship
      ? {
          provider: ship.provider ?? null,
          metadata:
            ship.metadata && typeof ship.metadata === 'object' ? ship.metadata : null,
          carrier: ship.carrier ?? null,
          service: ship.service ?? null,
          amount: ship.amount != null ? Number(ship.amount) : null,
        }
      : null
    const contracted = readContractedShipping(
      shipmentLite,
      o.shipping_amount != null ? Number(o.shipping_amount) : null,
    )
    const pickup = isOrderStorePickup({ shipment: shipmentLite })
    return {
      id: String(o.id),
      status: String(o.status),
      total: Number(o.total ?? 0),
      createdAt: String(o.created_at),
      itemCount: count,
      shippingChoiceLabel: contractedShippingShortLine(contracted),
      pickup,
      pickupAuthorized: pickup ? isStorePickupAuthorized(shipmentLite?.metadata) : false,
    }
  })
}
