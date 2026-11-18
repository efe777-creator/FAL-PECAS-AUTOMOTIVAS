import { getSupabase } from '@/lib/supabase'
import { getCurrentCustomerId } from '@/services/customers/customerService'
import {
  g7TypeToCategory,
  type VehicleEventCategory,
  type VehicleValidationState,
} from '@/services/garage/vehicleEventTypes'
import {
  eventProductLabel,
  listVehiclePartEvents,
  VEHICLE_PART_EVENT_LABEL,
} from '@/services/garage/vehiclePartEventService'

export type TimelineMode = 'vida' | 'meu'

export type TimelineItem = {
  id: string
  source: 'vehicle_event' | 'g7'
  category: VehicleEventCategory
  title: string
  description?: string | null
  occurredAt: string
  recordedAt: string
  odometerKm?: number | null
  validationState?: VehicleValidationState | null
  ownershipPeriodId?: string | null
  orderId?: string | null
  provenance: string
}

export type VehicleEventRow = {
  id: string
  vehicleIdentityId: string
  ownershipPeriodId: string | null
  category: VehicleEventCategory
  title: string
  description: string | null
  occurredAt: string
  recordedAt: string
  odometerKm: number | null
  validationState: VehicleValidationState
  provenance: string
  originRef: Record<string, unknown>
}

type EventDb = {
  id: string
  vehicle_identity_id: string
  ownership_period_id: string | null
  category: string
  title: string
  description: string | null
  occurred_at: string
  recorded_at: string
  odometer_km: number | null
  validation_state: string
  provenance: string
  origin_ref: Record<string, unknown> | null
}

function mapEvent(row: EventDb): VehicleEventRow {
  return {
    id: String(row.id),
    vehicleIdentityId: String(row.vehicle_identity_id),
    ownershipPeriodId: row.ownership_period_id ? String(row.ownership_period_id) : null,
    category: row.category as VehicleEventCategory,
    title: row.title,
    description: row.description,
    occurredAt: row.occurred_at,
    recordedAt: row.recorded_at,
    odometerKm: row.odometer_km,
    validationState: row.validation_state as VehicleValidationState,
    provenance: row.provenance,
    originRef: row.origin_ref ?? {},
  }
}

export async function listVehicleEvents(identityId: string): Promise<VehicleEventRow[]> {
  const { data, error } = await getSupabase()
    .from('vehicle_events')
    .select(
      'id, vehicle_identity_id, ownership_period_id, category, title, description, occurred_at, recorded_at, odometer_km, validation_state, provenance, origin_ref',
    )
    .eq('vehicle_identity_id', identityId)
    .order('occurred_at', { ascending: false })
  if (error) throw error
  return ((data ?? []) as EventDb[]).map(mapEvent)
}

export async function appendVehicleEvent(input: {
  vehicleIdentityId: string
  category: VehicleEventCategory
  title: string
  description?: string | null
  occurredAt?: string
  odometerKm?: number | null
  createOdometerRecord?: boolean
  originRef?: Record<string, unknown>
}): Promise<VehicleEventRow> {
  const { data, error } = await getSupabase().rpc('append_vehicle_event', {
    p_vehicle_identity_id: input.vehicleIdentityId,
    p_category: input.category,
    p_title: input.title,
    p_description: input.description ?? null,
    p_occurred_at: input.occurredAt ?? new Date().toISOString(),
    p_odometer_km: input.odometerKm ?? null,
    p_create_odometer_record: Boolean(input.createOdometerRecord),
    p_origin_ref: input.originRef ?? {},
  })
  if (error) throw error
  return mapEvent(data as EventDb)
}

export async function transitionVehicleEventValidation(input: {
  eventId: string
  newState: VehicleValidationState
  reason: string
}): Promise<VehicleEventRow> {
  const { data, error } = await getSupabase().rpc('transition_vehicle_event_validation', {
    p_event_id: input.eventId,
    p_new_state: input.newState,
    p_reason: input.reason,
  })
  if (error) throw error
  return mapEvent(data as EventDb)
}

/** Timeline unificada: vehicle_events + G7 (via membership + mapa). Anti-leak: só o que RLS devolve. */
export async function listIdentityTimeline(input: {
  vehicleIdentityId: string
  membershipId: string
  mode: TimelineMode
}): Promise<TimelineItem[]> {
  const customerId = await getCurrentCustomerId()
  const [events, partEvents, myPeriods] = await Promise.all([
    listVehicleEvents(input.vehicleIdentityId),
    listVehiclePartEvents(input.membershipId),
    customerId
      ? getSupabase()
          .from('vehicle_ownership_periods')
          .select('id, started_at, registered_at, ended_at')
          .eq('vehicle_identity_id', input.vehicleIdentityId)
          .eq('customer_id', customerId)
      : Promise.resolve({ data: [], error: null }),
  ])

  if (myPeriods.error) throw myPeriods.error
  const periodIds = new Set(
    ((myPeriods.data ?? []) as { id: string }[]).map((p) => String(p.id)),
  )

  const items: TimelineItem[] = []

  for (const ev of events) {
    if (input.mode === 'meu') {
      if (!ev.ownershipPeriodId || !periodIds.has(ev.ownershipPeriodId)) continue
    }
    items.push({
      id: `ve:${ev.id}`,
      source: 'vehicle_event',
      category: ev.category,
      title: ev.title,
      description: ev.description,
      occurredAt: ev.occurredAt,
      recordedAt: ev.recordedAt,
      odometerKm: ev.odometerKm,
      validationState: ev.validationState,
      ownershipPeriodId: ev.ownershipPeriodId,
      orderId:
        typeof ev.originRef.order_id === 'string' ? ev.originRef.order_id : null,
      provenance: ev.provenance,
    })
  }

  for (const pe of partEvents) {
    // G7 do membership atual = período do usuário (modo meu) ou vida (se membership atual)
    items.push({
      id: `g7:${pe.id}`,
      source: 'g7',
      category: g7TypeToCategory(pe.eventType),
      title: VEHICLE_PART_EVENT_LABEL[pe.eventType] ?? pe.eventType,
      description: eventProductLabel(pe),
      occurredAt: pe.createdAt,
      recordedAt: pe.createdAt,
      validationState: pe.eventType === 'installed_declared' ? 'declarado' : 'confirmado',
      orderId: pe.orderId,
      provenance: pe.provenance,
    })
  }

  items.sort((a, b) => (a.occurredAt < b.occurredAt ? 1 : a.occurredAt > b.occurredAt ? -1 : 0))
  return items
}
