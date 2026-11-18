import { getSupabase } from '@/lib/supabase'

export type VehicleShare = {
  id: string
  vehicleIdentityId: string
  grantorCustomerId: string
  granteeCustomerId: string | null
  modules: string[]
  canReadBasics: boolean
  canReadHistory: boolean
  canReadEvidence: boolean
  canRegisterEvent: boolean
  canUpdateKm: boolean
  expiresAt: string | null
  revokedAt: string | null
  note: string | null
  createdAt: string
}

type Row = {
  id: string
  vehicle_identity_id: string
  grantor_customer_id: string
  grantee_customer_id: string | null
  modules: string[] | null
  can_read_basics: boolean
  can_read_history: boolean
  can_read_evidence: boolean
  can_register_event: boolean
  can_update_km: boolean
  expires_at: string | null
  revoked_at: string | null
  note: string | null
  created_at: string
}

function mapShare(row: Row): VehicleShare {
  return {
    id: String(row.id),
    vehicleIdentityId: String(row.vehicle_identity_id),
    grantorCustomerId: String(row.grantor_customer_id),
    granteeCustomerId: row.grantee_customer_id ? String(row.grantee_customer_id) : null,
    modules: row.modules ?? ['visao'],
    canReadBasics: Boolean(row.can_read_basics),
    canReadHistory: Boolean(row.can_read_history),
    canReadEvidence: Boolean(row.can_read_evidence),
    canRegisterEvent: Boolean(row.can_register_event),
    canUpdateKm: Boolean(row.can_update_km),
    expiresAt: row.expires_at,
    revokedAt: row.revoked_at,
    note: row.note,
    createdAt: row.created_at,
  }
}

export async function listVehicleShares(vehicleIdentityId: string): Promise<VehicleShare[]> {
  const { data, error } = await getSupabase()
    .from('vehicle_shares')
    .select(
      'id, vehicle_identity_id, grantor_customer_id, grantee_customer_id, modules, can_read_basics, can_read_history, can_read_evidence, can_register_event, can_update_km, expires_at, revoked_at, note, created_at',
    )
    .eq('vehicle_identity_id', vehicleIdentityId)
    .order('created_at', { ascending: false })
  if (error) throw error
  return ((data ?? []) as Row[]).map(mapShare)
}

export async function createVehicleShare(input: {
  vehicleIdentityId: string
  granteeCustomerId: string
  modules?: string[]
  canReadHistory?: boolean
  canReadEvidence?: boolean
  canRegisterEvent?: boolean
  canUpdateKm?: boolean
  expiresAt?: string | null
  note?: string | null
}): Promise<VehicleShare> {
  const { data, error } = await getSupabase().rpc('create_vehicle_share', {
    p_vehicle_identity_id: input.vehicleIdentityId,
    p_grantee_customer_id: input.granteeCustomerId,
    p_modules: input.modules ?? ['visao'],
    p_can_read_history: Boolean(input.canReadHistory),
    p_can_read_evidence: Boolean(input.canReadEvidence),
    p_can_register_event: Boolean(input.canRegisterEvent),
    p_can_update_km: Boolean(input.canUpdateKm),
    p_expires_at: input.expiresAt ?? null,
    p_note: input.note ?? null,
  })
  if (error) throw error
  return mapShare(data as Row)
}

export async function revokeVehicleShare(shareId: string): Promise<VehicleShare> {
  const { data, error } = await getSupabase().rpc('revoke_vehicle_share', {
    p_share_id: shareId,
  })
  if (error) throw error
  return mapShare(data as Row)
}
