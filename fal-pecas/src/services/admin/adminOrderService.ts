import { getSupabase } from '@/lib/supabase'
import { transitionOrderStatus } from '@/services/orders/orderTransitionService'

export type OrderItemAvailability = 'disponivel' | 'disponivel_com_prazo' | 'indisponivel'

export type AdminOrderListRow = {
  id: string
  status: string
  total: number
  createdAt: string
  customerName: string | null
  itemCount: number
  paymentStatus: string | null
  paymentExpiresAt: string | null
}

export type AdminOrderItem = {
  id: string
  productId: string | null
  sku: string
  nameSnapshot: string
  unitPrice: number
  quantity: number
  availability: OrderItemAvailability | null
  leadDays: number | null
  staffNote: string | null
  separated?: boolean
}

export type AdminOrderDetail = {
  id: string
  status: string
  subtotal: number
  shippingAmount: number
  total: number
  createdAt: string
  addressSnapshot: Record<string, unknown> | null
  paymentRef: string | null
  customerId: string
  customerName: string | null
  customerEmail: string | null
  customerDoc: string | null
  items: AdminOrderItem[]
  events: {
    id: string
    eventType: string
    payload: Record<string, unknown>
    visibility: string
    createdAt: string
  }[]
  payment: {
    id: string
    provider: string | null
    status: string
    amount: number | null
    externalRef?: string | null
    expiresAt?: string | null
    method?: string | null
  } | null
  shipment: {
    id: string
    provider: string | null
    status: string
    trackingCode: string | null
    amount: number | null
    metadata: Record<string, unknown> | null
    carrier?: string | null
    service?: string | null
    shippedAt?: string | null
    deliveredAt?: string | null
    proofRef?: string | null
  } | null
}

export async function adminListOrders(filterStatus?: string | null): Promise<AdminOrderListRow[]> {
  let q = getSupabase()
    .from('orders')
    .select(
      `
      id, status, total, created_at, customer_id,
      customers ( cpf, cnpj, profiles ( full_name ) ),
      order_items ( id ),
      payments ( status, expires_at )
    `,
    )
    .order('created_at', { ascending: false })
    .limit(200)

  if (filterStatus) q = q.eq('status', filterStatus)

  const { data, error } = await q
  if (error) throw error

  return (data ?? []).map((row) => {
    const r = row as Record<string, unknown>
    const cust = r.customers as Record<string, unknown> | Record<string, unknown>[] | null
    const c = Array.isArray(cust) ? cust[0] : cust
    const profiles = c?.profiles as { full_name?: string } | { full_name?: string }[] | null | undefined
    const prof = Array.isArray(profiles) ? profiles[0] : profiles
    const items = r.order_items as unknown[] | null
    const pays = r.payments as { status?: string; expires_at?: string }[] | null
    const pay = Array.isArray(pays) ? pays[0] : null
    return {
      id: String(r.id),
      status: String(r.status),
      total: Number(r.total ?? 0),
      createdAt: String(r.created_at),
      customerName: prof?.full_name != null ? String(prof.full_name) : null,
      itemCount: Array.isArray(items) ? items.length : 0,
      paymentStatus: pay?.status != null ? String(pay.status) : null,
      paymentExpiresAt: pay?.expires_at != null ? String(pay.expires_at) : null,
    }
  })
}

export async function adminGetOrderDetail(orderId: string): Promise<AdminOrderDetail | null> {
  const { data, error } = await getSupabase()
    .from('orders')
    .select(
      `
      id, status, subtotal, shipping_amount, total, created_at, address_snapshot, payment_ref, customer_id,
      customers ( cpf, cnpj, profiles ( full_name, username ) ),
      order_items ( id, product_id, sku, name_snapshot, unit_price, quantity, availability, lead_days, staff_note, separated ),
      order_events ( id, event_type, payload, visibility, created_at ),
      payments ( id, provider, status, amount, external_ref, expires_at, method ),
      shipments ( id, provider, status, amount, tracking_code, metadata, carrier, service, shipped_at, delivered_at, proof_ref )
    `,
    )
    .eq('id', orderId)
    .maybeSingle()
  if (error) throw error
  if (!data) return null

  const r = data as Record<string, unknown>
  const cust = r.customers as Record<string, unknown> | Record<string, unknown>[] | null
  const c = (Array.isArray(cust) ? cust[0] : cust) ?? null
  const profiles = c?.profiles as
    | { username?: string; full_name?: string }
    | { username?: string; full_name?: string }[]
    | null
    | undefined
  const prof = Array.isArray(profiles) ? profiles[0] : profiles
  const doc = c?.cpf ? String(c.cpf) : c?.cnpj ? String(c.cnpj) : null

  const itemsRaw = r.order_items as unknown
  const items = Array.isArray(itemsRaw) ? itemsRaw : []
  const eventsRaw = r.order_events as unknown
  const events = Array.isArray(eventsRaw) ? eventsRaw : []
  const paymentsRaw = r.payments as unknown
  const payments = Array.isArray(paymentsRaw) ? paymentsRaw : []
  const shipmentsRaw = r.shipments as unknown
  const shipments = Array.isArray(shipmentsRaw) ? shipmentsRaw : []
  const payment = payments[0] as Record<string, unknown> | undefined
  const shipment = shipments[0] as Record<string, unknown> | undefined

  return {
    id: String(r.id),
    status: String(r.status),
    subtotal: Number(r.subtotal ?? 0),
    shippingAmount: Number(r.shipping_amount ?? 0),
    total: Number(r.total ?? 0),
    createdAt: String(r.created_at),
    addressSnapshot: (r.address_snapshot as Record<string, unknown> | null) ?? null,
    paymentRef: r.payment_ref != null ? String(r.payment_ref) : null,
    customerId: String(r.customer_id),
    customerName: prof?.full_name != null ? String(prof.full_name) : null,
    customerEmail: prof?.username != null ? String(prof.username) : null,
    customerDoc: doc,
    items: items.map((i: Record<string, unknown>) => ({
      id: String(i.id),
      productId: i.product_id != null ? String(i.product_id) : null,
      sku: String(i.sku),
      nameSnapshot: String(i.name_snapshot),
      unitPrice: Number(i.unit_price),
      quantity: Number(i.quantity),
      availability: (i.availability as OrderItemAvailability | null) ?? null,
      leadDays: i.lead_days != null ? Number(i.lead_days) : null,
      staffNote: i.staff_note != null ? String(i.staff_note) : null,
      separated: i.separated === true,
    })),
    events: events
      .map((e: Record<string, unknown>) => ({
        id: String(e.id),
        eventType: String(e.event_type),
        payload: (e.payload as Record<string, unknown>) ?? {},
        visibility: String(e.visibility),
        createdAt: String(e.created_at),
      }))
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt)),
    payment: payment
      ? {
          id: String(payment.id),
          provider: payment.provider != null ? String(payment.provider) : null,
          status: String(payment.status),
          amount: payment.amount != null ? Number(payment.amount) : null,
          externalRef: payment.external_ref != null ? String(payment.external_ref) : null,
          expiresAt: payment.expires_at != null ? String(payment.expires_at) : null,
          method: payment.method != null ? String(payment.method) : null,
        }
      : null,
    shipment: shipment
      ? {
          id: String(shipment.id),
          provider: shipment.provider != null ? String(shipment.provider) : null,
          status: String(shipment.status),
          trackingCode: shipment.tracking_code != null ? String(shipment.tracking_code) : null,
          amount: shipment.amount != null ? Number(shipment.amount) : null,
          metadata: (shipment.metadata as Record<string, unknown> | null) ?? null,
          carrier: shipment.carrier != null ? String(shipment.carrier) : null,
          service: shipment.service != null ? String(shipment.service) : null,
          shippedAt: shipment.shipped_at != null ? String(shipment.shipped_at) : null,
          deliveredAt: shipment.delivered_at != null ? String(shipment.delivered_at) : null,
          proofRef: shipment.proof_ref != null ? String(shipment.proof_ref) : null,
        }
      : null,
  }
}

export async function adminSetItemSeparated(orderItemId: string, separated: boolean): Promise<void> {
  const { error } = await getSupabase().rpc('set_order_item_separated', {
    p_order_item_id: orderItemId,
    p_separated: separated,
  })
  if (error) throw error
}

export async function adminCompleteSeparation(orderId: string): Promise<void> {
  const { error } = await getSupabase().rpc('complete_order_separation', {
    p_order_id: orderId,
  })
  if (error) throw error
}

export async function adminShipOrder(input: {
  orderId: string
  carrier?: string
  service?: string
  trackingCode?: string
}): Promise<void> {
  const { error } = await getSupabase().rpc('ship_order', {
    p_order_id: input.orderId,
    p_carrier: input.carrier ?? null,
    p_service: input.service ?? null,
    p_tracking_code: input.trackingCode ?? null,
  })
  if (error) throw error
}

export async function adminDeliverOrder(orderId: string, proofRef?: string): Promise<void> {
  const { error } = await getSupabase().rpc('deliver_order', {
    p_order_id: orderId,
    p_proof_ref: proofRef ?? null,
  })
  if (error) throw error
}

export async function adminOrderStatusCounts(): Promise<Record<string, number>> {
  const { data, error } = await getSupabase().rpc('admin_order_status_counts')
  if (error) throw error
  const obj = (data ?? {}) as Record<string, number>
  const out: Record<string, number> = {}
  for (const [k, v] of Object.entries(obj)) out[k] = Number(v)
  return out
}

export async function adminSetItemAvailability(input: {
  orderItemId: string
  availability: OrderItemAvailability
  leadDays?: number | null
  staffNote?: string | null
}): Promise<void> {
  const { error } = await getSupabase().rpc('set_order_item_availability', {
    p_order_item_id: input.orderItemId,
    p_availability: input.availability,
    p_lead_days: input.leadDays ?? null,
    p_staff_note: input.staffNote ?? null,
  })
  if (error) throw error
}

export async function adminFinalizeConfirmation(orderId: string): Promise<{
  result: string
  status: string
}> {
  const { data, error } = await getSupabase().rpc('finalize_order_confirmation', {
    p_order_id: orderId,
  })
  if (error) throw error
  const row = data as { result?: string; status?: string }
  return { result: String(row.result ?? ''), status: String(row.status ?? '') }
}

export async function adminCancelOrder(orderId: string, note?: string): Promise<void> {
  await transitionOrderStatus({
    orderId,
    toStatus: 'cancelado',
    note: note ?? 'Cancelamento administrativo',
    eventType: 'order_cancelled',
    eventVisibility: 'customer',
  })
}

export async function adminAdvanceOrder(
  orderId: string,
  toStatus: string,
  note?: string,
  eventType?: string,
): Promise<void> {
  await transitionOrderStatus({
    orderId,
    toStatus,
    note: note ?? null,
    eventType: eventType ?? 'status_changed',
    eventVisibility: toStatus === 'enviado' || toStatus === 'entregue' ? 'customer' : 'internal',
  })
}

export async function staffCanCancel(): Promise<boolean> {
  const { data, error } = await getSupabase().rpc('staff_can_cancel')
  if (error) throw error
  return Boolean(data)
}
