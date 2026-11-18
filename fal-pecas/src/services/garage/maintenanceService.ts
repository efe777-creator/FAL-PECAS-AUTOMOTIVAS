import { getSupabase } from '@/lib/supabase'
import type { MaintenanceType } from '@/services/garage/maintenanceTypes'

export type VehicleMaintenance = {
  id: string
  vehicleIdentityId: string
  eventId: string
  maintenanceType: MaintenanceType
  workshopName: string | null
  costCents: number | null
  nextDueAt: string | null
  nextDueKm: number | null
  professionalId: string | null
  createdAt: string
  title?: string
  occurredAt?: string
  odometerKm?: number | null
  validationState?: string
}

type MaintDb = {
  id: string
  vehicle_identity_id: string
  event_id: string
  maintenance_type: string
  workshop_name: string | null
  cost_cents: number | null
  next_due_at: string | null
  next_due_km: number | null
  professional_id: string | null
  created_at: string
}

function mapMaint(
  row: MaintDb,
  event?: {
    title: string
    occurred_at: string
    odometer_km: number | null
    validation_state: string
  },
): VehicleMaintenance {
  return {
    id: String(row.id),
    vehicleIdentityId: String(row.vehicle_identity_id),
    eventId: String(row.event_id),
    maintenanceType: row.maintenance_type as MaintenanceType,
    workshopName: row.workshop_name,
    costCents: row.cost_cents,
    nextDueAt: row.next_due_at,
    nextDueKm: row.next_due_km,
    professionalId: row.professional_id ? String(row.professional_id) : null,
    createdAt: row.created_at,
    title: event?.title,
    occurredAt: event?.occurred_at,
    odometerKm: event?.odometer_km,
    validationState: event?.validation_state,
  }
}

export async function listVehicleMaintenances(
  vehicleIdentityId: string,
): Promise<VehicleMaintenance[]> {
  const { data, error } = await getSupabase()
    .from('vehicle_maintenances')
    .select(
      'id, vehicle_identity_id, event_id, maintenance_type, workshop_name, cost_cents, next_due_at, next_due_km, professional_id, created_at',
    )
    .eq('vehicle_identity_id', vehicleIdentityId)
    .order('created_at', { ascending: false })
  if (error) throw error
  const rows = (data ?? []) as MaintDb[]
  if (!rows.length) return []

  const eventIds = rows.map((r) => String(r.event_id))
  const { data: events, error: eErr } = await getSupabase()
    .from('vehicle_events')
    .select('id, title, occurred_at, odometer_km, validation_state')
    .in('id', eventIds)
  if (eErr) throw eErr
  const byId = new Map(
    ((events ?? []) as Array<{
      id: string
      title: string
      occurred_at: string
      odometer_km: number | null
      validation_state: string
    }>).map((e) => [String(e.id), e]),
  )

  return rows.map((r) => mapMaint(r, byId.get(String(r.event_id))))
}

export async function appendVehicleMaintenance(input: {
  vehicleIdentityId: string
  maintenanceType: MaintenanceType
  title: string
  description?: string | null
  occurredAt?: string
  odometerKm?: number | null
  createOdometerRecord?: boolean
  workshopName?: string | null
  costCents?: number | null
  nextDueAt?: string | null
  nextDueKm?: number | null
  professionalId?: string | null
}): Promise<VehicleMaintenance> {
  const { data, error } = await getSupabase().rpc('append_vehicle_maintenance', {
    p_vehicle_identity_id: input.vehicleIdentityId,
    p_maintenance_type: input.maintenanceType,
    p_title: input.title,
    p_description: input.description ?? null,
    p_occurred_at: input.occurredAt ?? new Date().toISOString(),
    p_odometer_km: input.odometerKm ?? null,
    p_create_odometer_record: Boolean(input.createOdometerRecord),
    p_workshop_name: input.workshopName ?? null,
    p_cost_cents: input.costCents ?? null,
    p_next_due_at: input.nextDueAt ?? null,
    p_next_due_km: input.nextDueKm ?? null,
    p_professional_id: input.professionalId ?? null,
  })
  if (error) throw error
  return mapMaint(data as MaintDb, {
    title: input.title,
    occurred_at: input.occurredAt ?? new Date().toISOString(),
    odometer_km: input.odometerKm ?? null,
    validation_state: 'declarado',
  })
}
