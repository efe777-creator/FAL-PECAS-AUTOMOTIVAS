/**
 * G7 — histórico append-only de peças por veículo.
 */

import { getSupabase } from '@/lib/supabase'
import { getCurrentCustomerId } from '@/services/customers/customerService'

export type VehiclePartEventType =
  | 'bought'
  | 'associated'
  | 'awaiting_install'
  | 'installed_declared'
  | 'returned'
  | 'corrected'
  | 'disassociated'

export type VehiclePartEventProvenance = 'customer' | 'system'

export type VehiclePartEvent = {
  id: string
  customerId: string
  customerVehicleId: string | null
  orderId: string | null
  orderItemId: string | null
  productId: string | null
  eventType: VehiclePartEventType
  payload: Record<string, unknown>
  actorId: string | null
  provenance: VehiclePartEventProvenance
  createdAt: string
}

type Row = {
  id: string
  customer_id: string
  customer_vehicle_id: string | null
  order_id: string | null
  order_item_id: string | null
  product_id: string | null
  event_type: VehiclePartEventType
  payload: Record<string, unknown> | null
  actor_id: string | null
  provenance: VehiclePartEventProvenance
  created_at: string
}

const SELECT = `
  id, customer_id, customer_vehicle_id, order_id, order_item_id, product_id,
  event_type, payload, actor_id, provenance, created_at
`

export const VEHICLE_PART_EVENT_LABEL: Record<VehiclePartEventType, string> = {
  bought: 'Compra',
  associated: 'Associada ao veículo',
  awaiting_install: 'Aguardando instalação',
  installed_declared: 'Instalação declarada',
  returned: 'Devolvida',
  corrected: 'Correção',
  disassociated: 'Desassociada',
}

function mapRow(row: Row): VehiclePartEvent {
  return {
    id: String(row.id),
    customerId: String(row.customer_id),
    customerVehicleId: row.customer_vehicle_id ? String(row.customer_vehicle_id) : null,
    orderId: row.order_id ? String(row.order_id) : null,
    orderItemId: row.order_item_id ? String(row.order_item_id) : null,
    productId: row.product_id ? String(row.product_id) : null,
    eventType: row.event_type,
    payload: (row.payload ?? {}) as Record<string, unknown>,
    actorId: row.actor_id ? String(row.actor_id) : null,
    provenance: row.provenance,
    createdAt: row.created_at,
  }
}

export function eventProductLabel(event: VehiclePartEvent): string {
  const name = typeof event.payload.name === 'string' ? event.payload.name : null
  const sku = typeof event.payload.sku === 'string' ? event.payload.sku : null
  if (name && sku) return `${name} (${sku})`
  return name ?? sku ?? 'Peça'
}

/** Lista timeline do veículo (mais recente primeiro). */
export async function listVehiclePartEvents(
  customerVehicleId: string,
): Promise<VehiclePartEvent[]> {
  const { data, error } = await getSupabase()
    .from('customer_vehicle_part_events')
    .select(SELECT)
    .eq('customer_vehicle_id', customerVehicleId)
    .order('created_at', { ascending: false })
    .limit(100)
  if (error) throw error
  return ((data ?? []) as Row[]).map(mapRow)
}

const CUSTOMER_EVENT_TYPES: VehiclePartEventType[] = [
  'associated',
  'awaiting_install',
  'installed_declared',
  'returned',
  'corrected',
  'disassociated',
]

/**
 * Novo evento do cliente (nunca altera bought existente).
 */
export async function appendVehiclePartEvent(input: {
  customerVehicleId: string
  eventType: VehiclePartEventType
  productId?: string | null
  orderId?: string | null
  orderItemId?: string | null
  payload?: Record<string, unknown>
}): Promise<VehiclePartEvent> {
  if (!CUSTOMER_EVENT_TYPES.includes(input.eventType)) {
    throw new Error('Tipo de evento não permitido para o cliente.')
  }
  const customerId = await getCurrentCustomerId()
  if (!customerId) throw new Error('Faça login para registrar o evento.')

  const {
    data: { user },
  } = await getSupabase().auth.getUser()

  const { data, error } = await getSupabase()
    .from('customer_vehicle_part_events')
    .insert({
      customer_id: customerId,
      customer_vehicle_id: input.customerVehicleId,
      order_id: input.orderId ?? null,
      order_item_id: input.orderItemId ?? null,
      product_id: input.productId ?? null,
      event_type: input.eventType,
      payload: input.payload ?? {},
      actor_id: user?.id ?? null,
      provenance: 'customer',
    })
    .select(SELECT)
    .single()
  if (error) throw error
  return mapRow(data as Row)
}

/**
 * Declara instalação sem sobrescrever o bought (teste #19).
 */
export async function declareInstalled(input: {
  customerVehicleId: string
  sourceEvent: VehiclePartEvent
}): Promise<VehiclePartEvent> {
  const src = input.sourceEvent
  return appendVehiclePartEvent({
    customerVehicleId: input.customerVehicleId,
    eventType: 'installed_declared',
    productId: src.productId,
    orderId: src.orderId,
    orderItemId: src.orderItemId,
    payload: {
      sku: src.payload.sku ?? null,
      name: src.payload.name ?? null,
      fromEventId: src.id,
      fromEventType: src.eventType,
    },
  })
}

/** Pure: bought permanece na lista após install (contrato G7). */
export function boughtRemainsIntact(
  events: VehiclePartEvent[],
  boughtId: string,
): boolean {
  const bought = events.find((e) => e.id === boughtId)
  return Boolean(bought && bought.eventType === 'bought')
}

export type CollapsedPurchaseRow = {
  /** Prefer bought id; fallback associated. */
  id: string
  orderId: string | null
  orderItemId: string | null
  productId: string | null
  productLabel: string
  occurredAt: string
  hasBought: boolean
  hasAssociated: boolean
}

/**
 * Histórico cliente (fundação): 1 linha por order_item (ou product+order),
 * colapsando bought + associated. Ignora install/return etc. nesta onda.
 */
export function collapsePurchaseEventsForHistory(
  events: VehiclePartEvent[],
): CollapsedPurchaseRow[] {
  const purchaseTypes: VehiclePartEventType[] = ['bought', 'associated']
  const relevant = events.filter((e) => purchaseTypes.includes(e.eventType))
  const groups = new Map<string, VehiclePartEvent[]>()

  for (const ev of relevant) {
    const key =
      ev.orderItemId != null
        ? `oi:${ev.orderItemId}`
        : `fallback:${ev.orderId ?? ''}:${ev.productId ?? ''}:${ev.id}`
    const list = groups.get(key) ?? []
    list.push(ev)
    groups.set(key, list)
  }

  const rows: CollapsedPurchaseRow[] = []
  for (const list of groups.values()) {
    const bought = list.find((e) => e.eventType === 'bought')
    const associated = list.find((e) => e.eventType === 'associated')
    const primary = bought ?? associated ?? list[0]!
    rows.push({
      id: primary.id,
      orderId: primary.orderId,
      orderItemId: primary.orderItemId,
      productId: primary.productId,
      productLabel: eventProductLabel(primary),
      occurredAt: primary.createdAt,
      hasBought: Boolean(bought),
      hasAssociated: Boolean(associated),
    })
  }

  rows.sort((a, b) => (a.occurredAt < b.occurredAt ? 1 : a.occurredAt > b.occurredAt ? -1 : 0))
  return rows
}

export function hasSystemAssociatedForOrderItem(
  events: VehiclePartEvent[],
  orderItemId: string,
): boolean {
  return events.some(
    (e) =>
      e.orderItemId === orderItemId &&
      e.eventType === 'associated' &&
      e.provenance === 'system',
  )
}
