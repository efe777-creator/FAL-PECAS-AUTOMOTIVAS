import { getSupabase } from '@/lib/supabase'
import { getCurrentCustomerId } from '@/services/customers/customerService'
import {
  extFromMime,
  validateVehicleAssetFile,
  VEHICLE_ASSET_BUCKET,
  VEHICLE_ASSET_MAX_PER_VEHICLE,
  VEHICLE_ASSET_SIGNED_TTL_SEC,
} from '@/services/customers/vehicleAssetLimits'
import { updateSavedVehicle } from '@/services/customers/customerVehicleService'
import type { CustomerVehicleAsset } from '@/types'

type Row = {
  id: string
  customer_vehicle_id: string
  customer_id: string
  storage_path: string
  sort_order: number
  is_primary: boolean
  mime: string | null
  byte_size: number | null
  created_at: string
}

function mapAsset(row: Row, signedUrl?: string | null): CustomerVehicleAsset {
  return {
    id: String(row.id),
    customerVehicleId: String(row.customer_vehicle_id),
    customerId: String(row.customer_id),
    storagePath: row.storage_path,
    sortOrder: Number(row.sort_order) || 0,
    isPrimary: Boolean(row.is_primary),
    mime: row.mime,
    byteSize: row.byte_size,
    createdAt: row.created_at,
    signedUrl: signedUrl ?? null,
  }
}

async function signPaths(paths: string[]): Promise<Map<string, string>> {
  const map = new Map<string, string>()
  if (!paths.length) return map
  const { data, error } = await getSupabase()
    .storage.from(VEHICLE_ASSET_BUCKET)
    .createSignedUrls(paths, VEHICLE_ASSET_SIGNED_TTL_SEC)
  if (error) throw error
  for (const item of data ?? []) {
    if (item.path && item.signedUrl) map.set(item.path, item.signedUrl)
  }
  return map
}

export async function listVehicleAssets(
  customerVehicleId: string,
): Promise<CustomerVehicleAsset[]> {
  const customerId = await getCurrentCustomerId()
  if (!customerId) return []
  const { data, error } = await getSupabase()
    .from('customer_vehicle_assets')
    .select(
      'id, customer_vehicle_id, customer_id, storage_path, sort_order, is_primary, mime, byte_size, created_at',
    )
    .eq('customer_vehicle_id', customerVehicleId)
    .eq('customer_id', customerId)
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: true })
  if (error) throw error
  const rows = (data as Row[]) ?? []
  const signed = await signPaths(rows.map((r) => r.storage_path))
  return rows.map((r) => mapAsset(r, signed.get(r.storage_path) ?? null))
}

/**
 * Upload: Storage primeiro → insert asset. Se insert falhar, remove o objeto (sem órfão “completo”).
 */
export async function uploadVehicleAsset(
  customerVehicleId: string,
  file: File,
): Promise<CustomerVehicleAsset> {
  const customerId = await getCurrentCustomerId()
  if (!customerId) throw new Error('Cliente não encontrado')

  const validation = validateVehicleAssetFile(file)
  if (validation) throw new Error(validation)

  const existing = await listVehicleAssets(customerVehicleId)
  if (existing.length >= VEHICLE_ASSET_MAX_PER_VEHICLE) {
    throw new Error(`Limite de ${VEHICLE_ASSET_MAX_PER_VEHICLE} fotos por veículo.`)
  }

  const assetId = crypto.randomUUID()
  const mime = (file.type || 'image/jpeg').toLowerCase()
  const path = `${customerId}/${customerVehicleId}/${assetId}.${extFromMime(mime)}`
  const sb = getSupabase()

  const { error: upErr } = await sb.storage.from(VEHICLE_ASSET_BUCKET).upload(path, file, {
    cacheControl: '3600',
    upsert: false,
    contentType: mime,
  })
  if (upErr) throw upErr

  const makePrimary = existing.length === 0
  const { data, error } = await sb
    .from('customer_vehicle_assets')
    .insert({
      id: assetId,
      customer_vehicle_id: customerVehicleId,
      customer_id: customerId,
      storage_path: path,
      sort_order: existing.length,
      is_primary: makePrimary,
      mime,
      byte_size: file.size,
    })
    .select(
      'id, customer_vehicle_id, customer_id, storage_path, sort_order, is_primary, mime, byte_size, created_at',
    )
    .single()

  if (error) {
    await sb.storage.from(VEHICLE_ASSET_BUCKET).remove([path])
    throw error
  }

  if (makePrimary) {
    await updateSavedVehicle(customerVehicleId, { primaryAssetId: assetId })
  }

  const signed = await signPaths([path])
  return mapAsset(data as Row, signed.get(path) ?? null)
}

export async function setPrimaryVehicleAsset(
  customerVehicleId: string,
  assetId: string,
): Promise<void> {
  const customerId = await getCurrentCustomerId()
  if (!customerId) throw new Error('Cliente não encontrado')
  const sb = getSupabase()

  const { error: clearErr } = await sb
    .from('customer_vehicle_assets')
    .update({ is_primary: false })
    .eq('customer_vehicle_id', customerVehicleId)
    .eq('customer_id', customerId)
  if (clearErr) throw clearErr

  const { error } = await sb
    .from('customer_vehicle_assets')
    .update({ is_primary: true })
    .eq('id', assetId)
    .eq('customer_vehicle_id', customerVehicleId)
    .eq('customer_id', customerId)
  if (error) throw error

  await updateSavedVehicle(customerVehicleId, { primaryAssetId: assetId })
}

export async function reorderVehicleAssets(
  customerVehicleId: string,
  orderedIds: string[],
): Promise<void> {
  const customerId = await getCurrentCustomerId()
  if (!customerId) throw new Error('Cliente não encontrado')
  const sb = getSupabase()
  await Promise.all(
    orderedIds.map((id, index) =>
      sb
        .from('customer_vehicle_assets')
        .update({ sort_order: index })
        .eq('id', id)
        .eq('customer_vehicle_id', customerVehicleId)
        .eq('customer_id', customerId)
        .then(({ error }) => {
          if (error) throw error
        }),
    ),
  )
}

export async function deleteVehicleAsset(asset: CustomerVehicleAsset): Promise<void> {
  const customerId = await getCurrentCustomerId()
  if (!customerId) throw new Error('Cliente não encontrado')
  const sb = getSupabase()

  await sb.storage.from(VEHICLE_ASSET_BUCKET).remove([asset.storagePath])

  const { error } = await sb
    .from('customer_vehicle_assets')
    .delete()
    .eq('id', asset.id)
    .eq('customer_id', customerId)
  if (error) throw error

  const remaining = await listVehicleAssets(asset.customerVehicleId)
  if (asset.isPrimary) {
    const next = remaining[0] ?? null
    if (next) {
      await setPrimaryVehicleAsset(asset.customerVehicleId, next.id)
    } else {
      await updateSavedVehicle(asset.customerVehicleId, { primaryAssetId: null })
    }
  }
}
