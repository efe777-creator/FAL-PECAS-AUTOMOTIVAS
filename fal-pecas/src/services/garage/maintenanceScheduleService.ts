import { getSupabase } from '@/lib/supabase'

export type ScheduleKind = 'time' | 'km' | 'both'
export type ScheduleSource = 'customer' | 'system' | 'estimated' | 'professional'

export type MaintenanceSchedule = {
  id: string
  vehicleIdentityId: string
  title: string
  description: string | null
  scheduleKind: ScheduleKind
  intervalDays: number | null
  intervalKm: number | null
  lastDoneAt: string | null
  lastDoneKm: number | null
  nextDueAt: string | null
  nextDueKm: number | null
  source: ScheduleSource
  active: boolean
  createdAt: string
}

type Row = {
  id: string
  vehicle_identity_id: string
  title: string
  description: string | null
  schedule_kind: string
  interval_days: number | null
  interval_km: number | null
  last_done_at: string | null
  last_done_km: number | null
  next_due_at: string | null
  next_due_km: number | null
  source: string
  active: boolean
  created_at: string
}

function mapRow(row: Row): MaintenanceSchedule {
  return {
    id: String(row.id),
    vehicleIdentityId: String(row.vehicle_identity_id),
    title: row.title,
    description: row.description,
    scheduleKind: row.schedule_kind as ScheduleKind,
    intervalDays: row.interval_days,
    intervalKm: row.interval_km,
    lastDoneAt: row.last_done_at,
    lastDoneKm: row.last_done_km,
    nextDueAt: row.next_due_at,
    nextDueKm: row.next_due_km,
    source: row.source as ScheduleSource,
    active: Boolean(row.active),
    createdAt: row.created_at,
  }
}

export async function listMaintenanceSchedules(
  vehicleIdentityId: string,
): Promise<MaintenanceSchedule[]> {
  const { data, error } = await getSupabase()
    .from('vehicle_maintenance_schedules')
    .select(
      'id, vehicle_identity_id, title, description, schedule_kind, interval_days, interval_km, last_done_at, last_done_km, next_due_at, next_due_km, source, active, created_at',
    )
    .eq('vehicle_identity_id', vehicleIdentityId)
    .eq('active', true)
    .order('created_at', { ascending: false })
  if (error) throw error
  return ((data ?? []) as Row[]).map(mapRow)
}

export async function upsertMaintenanceSchedule(input: {
  id?: string | null
  vehicleIdentityId: string
  title: string
  description?: string | null
  scheduleKind: ScheduleKind
  intervalDays?: number | null
  intervalKm?: number | null
  lastDoneAt?: string | null
  lastDoneKm?: number | null
  source?: ScheduleSource
}): Promise<MaintenanceSchedule> {
  const { data, error } = await getSupabase().rpc('upsert_vehicle_maintenance_schedule', {
    p_id: input.id ?? null,
    p_vehicle_identity_id: input.vehicleIdentityId,
    p_title: input.title,
    p_description: input.description ?? null,
    p_schedule_kind: input.scheduleKind,
    p_interval_days: input.intervalDays ?? null,
    p_interval_km: input.intervalKm ?? null,
    p_last_done_at: input.lastDoneAt ?? null,
    p_last_done_km: input.lastDoneKm ?? null,
    p_source: input.source ?? 'customer',
    p_active: true,
  })
  if (error) throw error
  return mapRow(data as Row)
}

export async function deactivateMaintenanceSchedule(id: string): Promise<void> {
  const { error } = await getSupabase()
    .from('vehicle_maintenance_schedules')
    .update({ active: false, updated_at: new Date().toISOString() })
    .eq('id', id)
  if (error) throw error
}
