import { getSupabase } from '@/lib/supabase'
import {
  assetReadyForPublicViewer,
  type VehicleVisualAsset,
  type VisualAssetFormat,
  type VisualAssetSource,
  type VisualAssetStatus,
} from '@/services/garage/vehicleVisualAssetTypes'

type AssetDb = {
  id: string
  code: string
  display_name: string
  storage_path: string
  format: string
  poly_count: number | null
  texture_budget_mb: number | string | null
  source: string
  vendor: string | null
  license: string | null
  commercial_ok: boolean
  redistribute_ok: boolean
  version: string
  status: string
  approved_at: string | null
}

function mapAsset(row: AssetDb): VehicleVisualAsset {
  return {
    id: String(row.id),
    code: row.code,
    displayName: row.display_name,
    storagePath: row.storage_path,
    format: row.format as VisualAssetFormat,
    polyCount: row.poly_count,
    textureBudgetMb:
      row.texture_budget_mb == null ? null : Number(row.texture_budget_mb),
    source: row.source as VisualAssetSource,
    vendor: row.vendor,
    license: row.license,
    commercialOk: Boolean(row.commercial_ok),
    redistributeOk: Boolean(row.redistribute_ok),
    version: row.version,
    status: row.status as VisualAssetStatus,
    approvedAt: row.approved_at,
  }
}

/** Lookup RPC: asset aprovado compatível com a identity (ou null). */
export async function findApprovedVisualAssetForIdentity(
  vehicleIdentityId: string,
): Promise<VehicleVisualAsset | null> {
  const { data, error } = await getSupabase().rpc(
    'find_approved_visual_asset_for_identity',
    { p_vehicle_identity_id: vehicleIdentityId },
  )
  if (error) throw error
  if (!data) return null
  const mapped = mapAsset(data as AssetDb)
  return assetReadyForPublicViewer(mapped) ? mapped : null
}

export async function hasApprovedVisualGlb(
  vehicleIdentityId: string,
): Promise<boolean> {
  const asset = await findApprovedVisualAssetForIdentity(vehicleIdentityId)
  return Boolean(asset)
}

/** Signed URL só para path de asset aprovado (TTL curto). */
export async function signVisualAssetUrl(
  storagePath: string,
  expiresSec = 120,
): Promise<string | null> {
  const { data, error } = await getSupabase()
    .storage.from('vehicle-visual-assets')
    .createSignedUrl(storagePath, expiresSec)
  if (error) throw error
  return data?.signedUrl ?? null
}
