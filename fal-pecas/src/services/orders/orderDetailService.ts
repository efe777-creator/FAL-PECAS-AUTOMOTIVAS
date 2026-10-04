import { getSupabase } from '@/lib/supabase'
import { getCurrentCustomerId } from '@/services/customers/customerService'
import type { OrderDetail, OrderLifecycleEvent } from '@/types'

export async function getMyOrderDetail(orderId: string): Promise<OrderDetail | null> {
  const customerId = await getCurrentCustomerId()
  if (!customerId) return null

  const { data, error } = await getSupabase()
    .from('orders')
    .select(
      `
      id, status, subtotal, shipping_amount, total, created_at, address_snapshot, payment_ref,
      order_items ( id, product_id, sku, name_snapshot, unit_price, quantity ),
      order_status_history ( id, status, note, created_at ),
      order_events ( id, event_type, payload, visibility, created_at ),
      payments ( id, provider, status, amount, external_ref ),
      shipments ( id, provider, status, amount, tracking_code, metadata )
    `,
    )
    .eq('id', orderId)
    .eq('customer_id', customerId)
    .maybeSingle()
  if (error) throw error
  if (!data) return null

  const itemsRaw = data.order_items as unknown
  const items = Array.isArray(itemsRaw) ? itemsRaw : []
  const historyRaw = data.order_status_history as unknown
  const history = Array.isArray(historyRaw) ? historyRaw : []
  const eventsRaw = data.order_events as unknown
  const eventsAll = Array.isArray(eventsRaw) ? eventsRaw : []
  const paymentsRaw = data.payments as unknown
  const payments = Array.isArray(paymentsRaw) ? paymentsRaw : []
  const shipmentsRaw = data.shipments as unknown
  const shipments = Array.isArray(shipmentsRaw) ? shipmentsRaw : []

  const payment = payments[0] as
    | {
        id: string
        provider?: string
        status: string
        amount?: number
        external_ref?: string
      }
    | undefined
  const shipment = shipments[0] as
    | {
        id: string
        provider?: string
        status: string
        amount?: number
        tracking_code?: string
        metadata?: Record<string, unknown>
      }
    | undefined

  const events: OrderLifecycleEvent[] = eventsAll
    .filter((e: Record<string, unknown>) => String(e.visibility) === 'customer')
    .map((e: Record<string, unknown>) => ({
      id: String(e.id),
      eventType: String(e.event_type),
      payload: (e.payload as Record<string, unknown>) ?? {},
      visibility: 'customer' as const,
      createdAt: String(e.created_at),
    }))
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt))

  return {
    id: String(data.id),
    status: String(data.status),
    subtotal: Number(data.subtotal ?? 0),
    shippingAmount: Number(data.shipping_amount ?? 0),
    total: Number(data.total ?? 0),
    createdAt: String(data.created_at),
    addressSnapshot: (data.address_snapshot as Record<string, unknown> | null) ?? null,
    paymentRef: data.payment_ref != null ? String(data.payment_ref) : null,
    items: items.map((i: Record<string, unknown>) => ({
      id: String(i.id),
      productId: i.product_id != null ? String(i.product_id) : null,
      sku: String(i.sku),
      nameSnapshot: String(i.name_snapshot),
      unitPrice: Number(i.unit_price),
      quantity: Number(i.quantity),
    })),
    history: history
      .map((h: Record<string, unknown>) => ({
        id: String(h.id),
        status: String(h.status),
        note: h.note != null ? String(h.note) : null,
        createdAt: String(h.created_at),
      }))
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt)),
    events,
    payment: payment
      ? {
          id: String(payment.id),
          provider: payment.provider ?? null,
          status: String(payment.status),
          amount: payment.amount != null ? Number(payment.amount) : null,
          externalRef: payment.external_ref ?? null,
        }
      : null,
    shipment: shipment
      ? {
          id: String(shipment.id),
          provider: shipment.provider ?? null,
          status: String(shipment.status),
          amount: shipment.amount != null ? Number(shipment.amount) : null,
          trackingCode: shipment.tracking_code ?? null,
          metadata: shipment.metadata ?? null,
        }
      : null,
  }
}
