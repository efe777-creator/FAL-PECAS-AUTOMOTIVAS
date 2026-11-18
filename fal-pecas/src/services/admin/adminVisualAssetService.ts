import { getSupabase } from '@/lib/supabase'
import {
  type VehicleVisualAsset,
  type VisualAssetFormat,
  type VisualAssetSource,
  type VisualAssetStatus,
  type VisualCompatStatus,
} from '@/services/garage/vehicleVisualAssetTypes'

export type AdminVisualAssetRow = VehicleVisualAsset & {
  notes: string | null
  createdAt: string
  updatedAt: string
}

export type AdminVisualCompatRow = {
  id: string
  assetId: string
  manufacturerId: string | null
  modelId: string | null
  versionId: string | null
  yearFrom: number | null
  yearTo: number | null
  generation: string | null
  bodyStyle: string | null
  facelift: string | null
  market: string | null
  status: VisualCompatStatus
  notes: string | null
}

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
  notes: string | null
  created_at: string
  updated_at: string
}

function mapAsset(row: AssetDb): AdminVisualAssetRow {
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
    notes: row.notes,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

/** Transições de status permitidas (ADM). */
export function canTransitionAssetStatus(
  from: VisualAssetStatus,
  to: VisualAssetStatus,
): boolean {
  if (from === to) return true
  if (to === 'draft') return from === 'rejected'
  if (to === 'approved') return from === 'draft' || from === 'rejected'
  if (to === 'rejected') return from === 'draft' || from === 'approved'
  if (to === 'revoked') return from === 'approved'
  return false
}

export async function adminListVisualAssets(): Promise<AdminVisualAssetRow[]> {
  const { data, error } = await getSupabase()
    .from('vehicle_visual_assets')
    .select(
      'id, code, display_name, storage_path, format, poly_count, texture_budget_mb, source, vendor, license, commercial_ok, redistribute_ok, version, status, approved_at, notes, created_at, updated_at',
    )
    .order('updated_at', { ascending: false })
  if (error) throw error
  return ((data ?? []) as AssetDb[]).map(mapAsset)
}

export async function adminListCompatForAsset(
  assetId: string,
): Promise<AdminVisualCompatRow[]> {
  const { data, error } = await getSupabase()
    .from('vehicle_visual_asset_compat')
    .select(
      'id, asset_id, manufacturer_id, model_id, version_id, year_from, year_to, generation, body_style, facelift, market, status, notes',
    )
    .eq('asset_id', assetId)
    .order('created_at', { ascending: false })
  if (error) throw error
  return ((data ?? []) as Array<Record<string, unknown>>).map((r) => ({
    id: String(r.id),
    assetId: String(r.asset_id),
    manufacturerId: r.manufacturer_id ? String(r.manufacturer_id) : null,
    modelId: r.model_id ? String(r.model_id) : null,
    versionId: r.version_id ? String(r.version_id) : null,
    yearFrom: typeof r.year_from === 'number' ? r.year_from : null,
    yearTo: typeof r.year_to === 'number' ? r.year_to : null,
    generation: typeof r.generation === 'string' ? r.generation : null,
    bodyStyle: typeof r.body_style === 'string' ? r.body_style : null,
    facelift: typeof r.facelift === 'string' ? r.facelift : null,
    market: typeof r.market === 'string' ? r.market : null,
    status: r.status as VisualCompatStatus,
    notes: typeof r.notes === 'string' ? r.notes : null,
  }))
}

function sanitizeCode(code: string): string {
  return code
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 64)
}

export async function adminCreateVisualAssetDraft(input: {
  code: string
  displayName: string
  format: VisualAssetFormat
  source: VisualAssetSource
  vendor?: string
  license?: string
  commercialOk: boolean
  redistributeOk: boolean
  version?: string
  notes?: string
  file: File
}): Promise<AdminVisualAssetRow> {
  const code = sanitizeCode(input.code)
  if (!code) throw new Error('code_invalid')
  if (!input.file) throw new Error('file_required')
  if (input.file.size > 50 * 1024 * 1024) throw new Error('file_too_large')

  // IA sem commercial_ok: pode cadastrar draft, mas não aprovar no viewer (já coberto em assetReadyForPublicViewer)
  const ext = input.format === 'gltf' ? 'gltf' : 'glb'
  const storagePath = `draft/${code}/${Date.now()}.${ext}`

  const sb = getSupabase()
  const { error: upErr } = await sb.storage
    .from('vehicle-visual-assets')
    .upload(storagePath, input.file, {
      contentType:
        input.format === 'gltf' ? 'model/gltf+json' : 'model/gltf-binary',
      upsert: false,
    })
  if (upErr) throw upErr

  const { data, error } = await sb
    .from('vehicle_visual_assets')
    .insert({
      code,
      display_name: input.displayName.trim(),
      storage_path: storagePath,
      format: input.format,
      source: input.source,
      vendor: input.vendor?.trim() || null,
      license: input.license?.trim() || null,
      commercial_ok: input.commercialOk,
      redistribute_ok: input.redistributeOk,
      version: input.version?.trim() || '1',
      notes: input.notes?.trim() || null,
      status: 'draft',
    })
    .select(
      'id, code, display_name, storage_path, format, poly_count, texture_budget_mb, source, vendor, license, commercial_ok, redistribute_ok, version, status, approved_at, notes, created_at, updated_at',
    )
    .single()
  if (error) throw error
  return mapAsset(data as AssetDb)
}

export async function adminSetVisualAssetStatus(
  assetId: string,
  status: VisualAssetStatus,
): Promise<AdminVisualAssetRow> {
  const sb = getSupabase()
  const { data: cur, error: curErr } = await sb
    .from('vehicle_visual_assets')
    .select('status')
    .eq('id', assetId)
    .single()
  if (curErr) throw curErr
  const from = (cur as { status: VisualAssetStatus }).status
  if (!canTransitionAssetStatus(from, status)) {
    throw new Error(`invalid_status_transition:${from}->${status}`)
  }

  const patch: Record<string, unknown> = {
    status,
    updated_at: new Date().toISOString(),
  }
  if (status === 'approved') {
    const { data: userData } = await sb.auth.getUser()
    patch.approved_at = new Date().toISOString()
    patch.approved_by = userData.user?.id ?? null
  }
  if (status === 'revoked' || status === 'rejected' || status === 'draft') {
    if (status !== 'approved') {
      /* keep approved_* history unless draft reset */
    }
  }

  const { data, error } = await sb
    .from('vehicle_visual_assets')
    .update(patch)
    .eq('id', assetId)
    .select(
      'id, code, display_name, storage_path, format, poly_count, texture_budget_mb, source, vendor, license, commercial_ok, redistribute_ok, version, status, approved_at, notes, created_at, updated_at',
    )
    .single()
  if (error) throw error
  return mapAsset(data as AssetDb)
}

export async function adminAddVisualCompat(input: {
  assetId: string
  manufacturerId?: string | null
  modelId?: string | null
  versionId?: string | null
  yearFrom?: number | null
  yearTo?: number | null
  generation?: string | null
  bodyStyle?: string | null
  facelift?: string | null
  market?: string | null
  status?: VisualCompatStatus
  notes?: string | null
}): Promise<AdminVisualCompatRow> {
  const { data, error } = await getSupabase()
    .from('vehicle_visual_asset_compat')
    .insert({
      asset_id: input.assetId,
      manufacturer_id: input.manufacturerId || null,
      model_id: input.modelId || null,
      version_id: input.versionId || null,
      year_from: input.yearFrom ?? null,
      year_to: input.yearTo ?? null,
      generation: input.generation?.trim() || null,
      body_style: input.bodyStyle?.trim() || null,
      facelift: input.facelift?.trim() || null,
      market: input.market?.trim() || null,
      status: input.status ?? 'pending',
      notes: input.notes?.trim() || null,
    })
    .select(
      'id, asset_id, manufacturer_id, model_id, version_id, year_from, year_to, generation, body_style, facelift, market, status, notes',
    )
    .single()
  if (error) throw error
  const r = data as Record<string, unknown>
  return {
    id: String(r.id),
    assetId: String(r.asset_id),
    manufacturerId: r.manufacturer_id ? String(r.manufacturer_id) : null,
    modelId: r.model_id ? String(r.model_id) : null,
    versionId: r.version_id ? String(r.version_id) : null,
    yearFrom: typeof r.year_from === 'number' ? r.year_from : null,
    yearTo: typeof r.year_to === 'number' ? r.year_to : null,
    generation: typeof r.generation === 'string' ? r.generation : null,
    bodyStyle: typeof r.body_style === 'string' ? r.body_style : null,
    facelift: typeof r.facelift === 'string' ? r.facelift : null,
    market: typeof r.market === 'string' ? r.market : null,
    status: r.status as VisualCompatStatus,
    notes: typeof r.notes === 'string' ? r.notes : null,
  }
}

export async function adminSetCompatStatus(
  compatId: string,
  status: VisualCompatStatus,
): Promise<void> {
  const patch: Record<string, unknown> = {
    status,
    updated_at: new Date().toISOString(),
  }
  if (status === 'revoked') patch.revoked_at = new Date().toISOString()
  const { error } = await getSupabase()
    .from('vehicle_visual_asset_compat')
    .update(patch)
    .eq('id', compatId)
  if (error) throw error
}
