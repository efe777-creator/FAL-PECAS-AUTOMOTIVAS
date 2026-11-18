import { getSupabase } from '@/lib/supabase'
import { getCurrentCustomerId } from '@/services/customers/customerService'
import { pickMyVisualConfigRow } from '@/services/garage/visualPrivacyContract'
import {
  normalizeVisualPayload,
  type VehicleVisualPayload,
} from '@/services/garage/vehicleVisualTypes'

export type EvidenceVisibilityLike =
  | 'private_owner'
  | 'period'
  | 'shared'
  | 'public_vehicle'

export type VehicleVisualConfig = {
  id: string
  vehicleIdentityId: string
  ownerCustomerId: string
  ownershipPeriodId: string | null
  payload: VehicleVisualPayload
  visibility: EvidenceVisibilityLike
  updatedAt: string
}

type Row = {
  id: string
  vehicle_identity_id: string
  owner_customer_id: string
  ownership_period_id: string | null
  payload: unknown
  visibility: string
  updated_at: string
}

function mapRow(row: Row): VehicleVisualConfig {
  return {
    id: String(row.id),
    vehicleIdentityId: String(row.vehicle_identity_id),
    ownerCustomerId: String(row.owner_customer_id),
    ownershipPeriodId: row.ownership_period_id ? String(row.ownership_period_id) : null,
    payload: normalizeVisualPayload(row.payload),
    visibility: row.visibility as EvidenceVisibilityLike,
    updatedAt: row.updated_at,
  }
}

export async function getMyVisualConfig(
  vehicleIdentityId: string,
): Promise<VehicleVisualConfig | null> {
  const customerId = await getCurrentCustomerId()
  if (!customerId) return null

  // Defesa em profundidade: só a config do owner atual (prefs privadas não herdam).
  const { data, error } = await getSupabase()
    .from('vehicle_visual_configs')
    .select(
      'id, vehicle_identity_id, owner_customer_id, ownership_period_id, payload, visibility, updated_at',
    )
    .eq('vehicle_identity_id', vehicleIdentityId)
    .eq('owner_customer_id', customerId)
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (error) throw error
  if (!data) return null
  const mapped = mapRow(data as Row)
  return pickMyVisualConfigRow([mapped], customerId)
}

export async function upsertVisualConfig(input: {
  vehicleIdentityId: string
  payload: VehicleVisualPayload
  visibility?: EvidenceVisibilityLike
}): Promise<VehicleVisualConfig> {
  const { data, error } = await getSupabase().rpc('upsert_vehicle_visual_config', {
    p_vehicle_identity_id: input.vehicleIdentityId,
    p_payload: normalizeVisualPayload(input.payload),
    p_visibility: input.visibility ?? 'private_owner',
  })
  if (error) throw error
  return mapRow(data as Row)
}
