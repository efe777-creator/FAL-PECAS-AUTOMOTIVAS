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
  customerDecision: 'pending' | 'authorized' | 'rejected' | null
  cancellationRequest: 'pending' | 'approved' | 'rejected' | null
  cancellationReason: string | null
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
  /** Snapshot de estoque do SKU (quando modo com_estoque). */
  quantityOnHand?: number | null
  quantityReserved?: number | null
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
  customerDecision: 'pending' | 'authorized' | 'rejected' | null
  cancellationRequest: 'pending' | 'approved' | 'rejected' | null
  cancellationReason: string | null
  cancellationResolveNote: string | null
  /** Modo de estoque congelado no place_order. */
  inventoryModeAtOrder?: string | null
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

/** Tamanho padrão de página das listas admin (limite histórico de 200). */
export const ADMIN_LIST_PAGE_SIZE = 200

/** Filtros server-side (CP-CEN-040) — filas não dependem dos N pedidos mais recentes. */
export type AdminListOrdersOpts = {
  offset?: number
  limit?: number
  /** Preferir isto a `filterStatus` quando a fila tem vários status. */
  statuses?: readonly string[] | null
  cancellationRequest?: 'pending' | 'approved' | 'rejected' | null
  customerDecision?: 'pending' | 'authorized' | 'rejected' | null
  /**
   * Visão "problemas": decisão rejected OU aguardando_pagamento
   * (pagamento failed/rejected ainda refinado no cliente sobre este subconjunto).
   */
  problems?: boolean
}

export async function adminListOrders(
  filterStatus?: string | null,
  opts?: AdminListOrdersOpts,
): Promise<AdminOrderListRow[]> {
  const limit = opts?.limit ?? ADMIN_LIST_PAGE_SIZE
  const offset = opts?.offset ?? 0
  let q = getSupabase()
    .from('orders')
    .select(
      `
      id, status, total, created_at, customer_id, customer_decision,
      cancellation_request, cancellation_reason,
      customers ( cpf, cnpj, profiles ( full_name ) ),
      order_items ( id ),
      payments ( status, expires_at )
    `,
    )
    .order('created_at', { ascending: false })
    .order('id', { ascending: false })
    .range(offset, offset + limit - 1)

  if (opts?.problems) {
    q = q.or(
      'and(status.eq.aguardando_decisao,customer_decision.eq.rejected),status.eq.aguardando_pagamento',
    )
  } else if (opts?.statuses && opts.statuses.length > 0) {
    q = q.in('status', [...opts.statuses])
  } else if (filterStatus) {
    q = q.eq('status', filterStatus)
  }

  if (opts?.cancellationRequest) {
    q = q.eq('cancellation_request', opts.cancellationRequest)
  }
  if (opts?.customerDecision) {
    q = q.eq('customer_decision', opts.customerDecision)
  }

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
    const decision =
      r.customer_decision === 'pending' ||
      r.customer_decision === 'authorized' ||
      r.customer_decision === 'rejected'
        ? r.customer_decision
        : null
    const cancelReq =
      r.cancellation_request === 'pending' ||
      r.cancellation_request === 'approved' ||
      r.cancellation_request === 'rejected'
        ? r.cancellation_request
        : null
    return {
      id: String(r.id),
      status: String(r.status),
      total: Number(r.total ?? 0),
      createdAt: String(r.created_at),
      customerName: prof?.full_name != null ? String(prof.full_name) : null,
      itemCount: Array.isArray(items) ? items.length : 0,
      paymentStatus: pay?.status != null ? String(pay.status) : null,
      paymentExpiresAt: pay?.expires_at != null ? String(pay.expires_at) : null,
      customerDecision: decision,
      cancellationRequest: cancelReq,
      cancellationReason: r.cancellation_reason != null ? String(r.cancellation_reason) : null,
    }
  })
}

export async function adminGetOrderDetail(orderId: string): Promise<AdminOrderDetail | null> {
  const { data, error } = await getSupabase()
    .from('orders')
    .select(
      `
      id, status, subtotal, shipping_amount, total, created_at, address_snapshot, payment_ref, customer_id, customer_decision,
      cancellation_request, cancellation_reason, cancellation_resolve_note, inventory_mode_at_order,
      customers ( cpf, cnpj, profiles ( full_name, username ) ),
      order_items (
        id, product_id, sku, name_snapshot, unit_price, quantity, availability, lead_days, staff_note, separated,
        products ( inventory ( quantity_on_hand, quantity_reserved ) )
      ),
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
    customerDecision:
      r.customer_decision === 'pending' ||
      r.customer_decision === 'authorized' ||
      r.customer_decision === 'rejected'
        ? r.customer_decision
        : null,
    cancellationRequest:
      r.cancellation_request === 'pending' ||
      r.cancellation_request === 'approved' ||
      r.cancellation_request === 'rejected'
        ? r.cancellation_request
        : null,
    cancellationReason: r.cancellation_reason != null ? String(r.cancellation_reason) : null,
    cancellationResolveNote:
      r.cancellation_resolve_note != null ? String(r.cancellation_resolve_note) : null,
    inventoryModeAtOrder:
      r.inventory_mode_at_order != null ? String(r.inventory_mode_at_order) : null,
    items: items.map((i: Record<string, unknown>) => {
      const prod = i.products as Record<string, unknown> | Record<string, unknown>[] | null
      const p = (Array.isArray(prod) ? prod[0] : prod) ?? null
      const invRaw = p?.inventory as Record<string, unknown> | Record<string, unknown>[] | null
      const inv = (Array.isArray(invRaw) ? invRaw[0] : invRaw) ?? null
      return {
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
        quantityOnHand:
          inv?.quantity_on_hand != null ? Number(inv.quantity_on_hand) : null,
        quantityReserved:
          inv?.quantity_reserved != null ? Number(inv.quantity_reserved) : null,
      }
    }),
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

/** CP-CEN-011 — indicadores ops + financeiros (fórmulas V2). */
export type AdminCentralIndicators = {
  currency: string
  operational: {
    ordersCreated: number
    awaitingDecision: number
    cancelled: number
    cancellationPending: number
    byStatus: Record<string, number>
  }
  financial: {
    captured: number
    refunded: number
    netReceived: number
    grossSold: number
    cancelledAmount: number
    pendingPayment: number
  }
}

export async function adminCentralIndicators(): Promise<AdminCentralIndicators> {
  const { data, error } = await getSupabase().rpc('admin_central_indicators')
  if (error) throw error
  const raw = (data ?? {}) as Record<string, unknown>
  const ops = (raw.operational ?? {}) as Record<string, unknown>
  const fin = (raw.financial ?? {}) as Record<string, unknown>
  const byStatusRaw = (ops.by_status ?? {}) as Record<string, number>
  const byStatus: Record<string, number> = {}
  for (const [k, v] of Object.entries(byStatusRaw)) byStatus[k] = Number(v)
  return {
    currency: String(raw.currency ?? 'BRL'),
    operational: {
      ordersCreated: Number(ops.orders_created ?? 0),
      awaitingDecision: Number(ops.awaiting_decision ?? 0),
      cancelled: Number(ops.cancelled ?? 0),
      cancellationPending: Number(ops.cancellation_pending ?? 0),
      byStatus,
    },
    financial: {
      captured: Number(fin.captured ?? 0),
      refunded: Number(fin.refunded ?? 0),
      netReceived: Number(fin.net_received ?? 0),
      grossSold: Number(fin.gross_sold ?? 0),
      cancelledAmount: Number(fin.cancelled_amount ?? 0),
      pendingPayment: Number(fin.pending_payment ?? 0),
    },
  }
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

export type ExpireUnpaidOrdersResult = {
  expired: number
  orderIds: string[]
  maxAgeHours: number
  limit: number
}

/** TTL padrão 48h (idade do pedido). Pix QR expiry é independente. */
export async function adminExpireUnpaidOrders(opts?: {
  limit?: number
  maxAgeHours?: number
}): Promise<ExpireUnpaidOrdersResult> {
  const { data, error } = await getSupabase().rpc('expire_unpaid_orders', {
    p_limit: opts?.limit ?? 50,
    p_max_age_hours: opts?.maxAgeHours ?? 48,
  })
  if (error) throw error
  const row = data as {
    expired?: number
    order_ids?: string[] | null
    max_age_hours?: number
    limit?: number
  }
  return {
    expired: Number(row?.expired ?? 0),
    orderIds: Array.isArray(row?.order_ids) ? row.order_ids.map(String) : [],
    maxAgeHours: Number(row?.max_age_hours ?? 48),
    limit: Number(row?.limit ?? 50),
  }
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

export async function adminResolveOrderCancellation(
  orderId: string,
  approve: boolean,
  note?: string,
): Promise<{
  order_id: string
  status: string
  cancellation_request: string
  refund_policy?: string
  refund_status?: string
}> {
  const { data, error } = await getSupabase().rpc('admin_resolve_order_cancellation', {
    p_order_id: orderId,
    p_approve: approve,
    p_note: note?.trim() ? note.trim() : null,
  })
  if (error) throw error
  return data as {
    order_id: string
    status: string
    cancellation_request: string
    refund_policy?: string
    refund_status?: string
  }
}

export async function adminMarkPaymentRefunded(
  orderId: string,
  note?: string,
): Promise<{ order_id: string; payment_status: string }> {
  const { data, error } = await getSupabase().rpc('admin_mark_payment_refunded', {
    p_order_id: orderId,
    p_note: note?.trim() ? note.trim() : null,
  })
  if (error) throw error
  return data as { order_id: string; payment_status: string }
}

/** CP-EMB-01 — volumes neutros em shipments.metadata.packing */
export async function adminSetOrderPacking(
  orderId: string,
  volumes: unknown[],
): Promise<{ order_id: string; shipment_id: string }> {
  const { data, error } = await getSupabase().rpc('admin_set_order_packing', {
    p_order_id: orderId,
    p_volumes: volumes,
  })
  if (error) throw error
  return data as { order_id: string; shipment_id: string }
}

/** CP-EVT-01 — abrir / atualizar / resolver ocorrência */
export async function adminOccurrenceAction(input: {
  orderId: string
  action: 'open' | 'update' | 'resolve'
  occurrenceId?: string | null
  tipo?: string | null
  gravidade?: 'baixa' | 'media' | 'alta' | null
  note?: string | null
  solucao?: string | null
  visibility?: 'internal' | 'customer'
}): Promise<{ occurrence_id: string; event_type: string }> {
  const { data, error } = await getSupabase().rpc('admin_occurrence_action', {
    p_order_id: input.orderId,
    p_action: input.action,
    p_occurrence_id: input.occurrenceId ?? null,
    p_tipo: input.tipo ?? null,
    p_gravidade: input.gravidade ?? 'media',
    p_note: input.note ?? null,
    p_solucao: input.solucao ?? null,
    p_visibility: input.visibility ?? 'internal',
  })
  if (error) throw error
  return data as { occurrence_id: string; event_type: string }
}
