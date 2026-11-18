import { getSupabase } from '@/lib/supabase'
import { getCurrentCustomerId } from '@/services/customers/customerService'

export type OdometerRecord = {
  id: string
  vehicleIdentityId: string
  km: number
  recordedAt: string
  source: string
  note: string | null
}

/** Km mais recente por recorded_at — nunca inventa 0 se não houver leitura. */
export async function getLatestOdometerKm(
  vehicleIdentityId: string,
): Promise<number | null> {
  const { data, error } = await getSupabase()
    .from('vehicle_odometer_records')
    .select('km')
    .eq('vehicle_identity_id', vehicleIdentityId)
    .order('recorded_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (error) throw error
  if (!data) return null
  const km = (data as { km: number }).km
  return typeof km === 'number' ? km : null
}

export async function listOdometerRecords(
  vehicleIdentityId: string,
): Promise<OdometerRecord[]> {
  const { data, error } = await getSupabase()
    .from('vehicle_odometer_records')
    .select('id, vehicle_identity_id, km, recorded_at, source, note')
    .eq('vehicle_identity_id', vehicleIdentityId)
    .order('recorded_at', { ascending: false })
  if (error) throw error
  return ((data ?? []) as Array<{
    id: string
    vehicle_identity_id: string
    km: number
    recorded_at: string
    source: string
    note: string | null
  }>).map((r) => ({
    id: String(r.id),
    vehicleIdentityId: String(r.vehicle_identity_id),
    km: r.km,
    recordedAt: r.recorded_at,
    source: r.source,
    note: r.note,
  }))
}

export async function recordOdometer(input: {
  vehicleIdentityId: string
  km: number
  recordedAt?: string
  note?: string | null
}): Promise<OdometerRecord> {
  const customerId = await getCurrentCustomerId()
  if (!customerId) throw new Error('Cliente não encontrado')
  if (!Number.isFinite(input.km) || input.km < 0) {
    throw new Error('Quilometragem inválida')
  }

  const { data, error } = await getSupabase()
    .from('vehicle_odometer_records')
    .insert({
      vehicle_identity_id: input.vehicleIdentityId,
      km: Math.floor(input.km),
      recorded_at: input.recordedAt ?? new Date().toISOString(),
      source: 'customer',
      recording_customer_id: customerId,
      note: input.note?.trim() || null,
    })
    .select('id, vehicle_identity_id, km, recorded_at, source, note')
    .single()
  if (error) throw error
  const r = data as {
    id: string
    vehicle_identity_id: string
    km: number
    recorded_at: string
    source: string
    note: string | null
  }
  return {
    id: String(r.id),
    vehicleIdentityId: String(r.vehicle_identity_id),
    km: r.km,
    recordedAt: r.recorded_at,
    source: r.source,
    note: r.note,
  }
}
