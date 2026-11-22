import { formatModelDisplayName, normalizeEntityMatchKey } from '@/lib/entityNormalize'
import { getSupabase } from '@/lib/supabase'
import { toSlug } from '@/lib/slug'
import { normalizeVehicleMasterInput } from '@/services/vehicles/normalizeVehicleMasterInput'
import type { VehicleModel, VehicleVersion } from '@/types'

type ModelRow = {
  id: string
  manufacturer_id: string
  name: string
  slug: string
  status: string
  production_year_start?: number | null
  production_year_end?: number | null
  quality_status?: string | null
  vehicle_class?: string | null
  canonical_model_id?: string | null
  evidence_kind?: string | null
  evidence_url?: string | null
  review_note?: string | null
}

const MODEL_SELECT =
  'id, manufacturer_id, name, slug, status, production_year_start, production_year_end, quality_status, vehicle_class, canonical_model_id, evidence_kind, evidence_url, review_note'

type VersionRow = {
  id: string
  manufacturer_id: string
  model_id: string
  year: number | null
  engine: string | null
  version_name: string | null
  status: string
}

function mapModel(row: ModelRow): VehicleModel {
  return {
    id: row.id,
    manufacturerId: row.manufacturer_id,
    name: row.name,
    slug: row.slug,
    status: row.status as VehicleModel['status'],
    productionYearStart: row.production_year_start ?? null,
    productionYearEnd: row.production_year_end ?? null,
    qualityStatus: (row.quality_status ?? undefined) as VehicleModel['qualityStatus'],
    vehicleClass: row.vehicle_class ?? undefined,
    canonicalModelId: row.canonical_model_id ?? null,
    evidenceKind: row.evidence_kind ?? null,
    evidenceUrl: row.evidence_url ?? null,
    reviewNote: row.review_note ?? null,
  }
}

function mapVersion(row: VersionRow): VehicleVersion {
  return {
    id: row.id,
    manufacturerId: row.manufacturer_id,
    modelId: row.model_id,
    year: row.year,
    engine: row.engine,
    versionName: row.version_name,
    status: row.status as VehicleVersion['status'],
  }
}

export async function adminListModels(manufacturerId?: string): Promise<VehicleModel[]> {
  let q = getSupabase()
    .from('models')
    .select(MODEL_SELECT)
    .order('name')
  if (manufacturerId) q = q.eq('manufacturer_id', manufacturerId)
  const { data, error } = await q
  if (error) throw error
  return (data as ModelRow[]).map(mapModel)
}

export async function adminUpsertModel(input: {
  id?: string
  manufacturerId: string
  name: string
  slug?: string
  status?: VehicleModel['status']
  productionYearStart?: number | null
  productionYearEnd?: number | null
}): Promise<VehicleModel> {
  const rawName = formatModelDisplayName(input.name)
  if (!rawName) throw new Error('Informe o nome do modelo.')

  const { data: makerRow, error: makerErr } = await getSupabase()
    .from('manufacturers')
    .select('name')
    .eq('id', input.manufacturerId)
    .maybeSingle()
  if (makerErr) throw makerErr
  const makerName = String((makerRow as { name?: string } | null)?.name ?? '').trim()
  if (!makerName) throw new Error('Montadora não encontrada.')

  const normalized = normalizeVehicleMasterInput({ maker: makerName, model: rawName })
  if (normalized.outcome === 'reject' || !normalized.model) {
    throw new Error('Nome de modelo inválido para o mestre de veículos.')
  }
  // Nome canônico (typo/trim/motor removidos; Corolla Cross ≠ Corolla).
  const name = normalized.model
  // Modelo novo NUNCA nasce verified; outcome=review mantém/rebaixa para review.
  // Fica active (admin enxerga); a árvore pública filtra quality_status=verified.
  const keepReview = normalized.outcome === 'review'

  if (!input.id) {
    const siblings = await adminListModels(input.manufacturerId)
    const dup = siblings.find(
      (m) =>
        m.status === 'active' &&
        normalizeEntityMatchKey(m.name) === normalizeEntityMatchKey(name),
    )
    if (dup) throw new Error(`Já existe modelo "${dup.name}" nesta montadora.`)
  }

  const start = input.productionYearStart ?? null
  const end = input.productionYearEnd ?? null
  if (start != null && (start < 1950 || start > 2100)) {
    throw new Error('Ano inicial de linha inválido.')
  }
  if (end != null && (end < 1950 || end > 2100)) {
    throw new Error('Ano final de linha inválido.')
  }
  if (start != null && end != null && end < start) {
    throw new Error('Ano final de linha deve ser ≥ ano inicial.')
  }

  const payload = {
    manufacturer_id: input.manufacturerId,
    name,
    slug: (input.slug?.trim() || toSlug(name)) || toSlug(`model-${Date.now()}`),
    status: input.status ?? 'active',
    production_year_start: start,
    production_year_end: end,
  }
  // Update preserva quality_status (não promove) salvo outcome=review (rebaixa).
  const updatePayload = keepReview ? { ...payload, quality_status: 'review' } : payload
  const insertPayload = {
    ...payload,
    quality_status: 'review',
    vehicle_class: 'unknown',
    review_note: keepReview
      ? 'Criado via admin; nome com resíduo — revisar antes de verificar'
      : 'Criado via admin; aguarda evidência A1 ou A2+A2',
  }
  const q = getSupabase().from('models')
  const { data, error } = input.id
    ? await q
        .update(updatePayload)
        .eq('id', input.id)
        .select(MODEL_SELECT)
        .single()
    : await q
        .insert(insertPayload)
        .select(MODEL_SELECT)
        .single()
  if (error) throw error
  return mapModel(data as ModelRow)
}

/** Expande vida de linha do modelo (min start / max end). Sem PVC. */
export async function mergeModelProductionYears(
  modelId: string,
  yearStart?: number | null,
  yearEnd?: number | null,
): Promise<{ productionYearStart: number | null; productionYearEnd: number | null }> {
  const { data, error } = await getSupabase().rpc('merge_model_production_years', {
    p_model_id: modelId,
    p_year_start: yearStart ?? null,
    p_year_end: yearEnd ?? null,
  })
  if (error) throw error
  const row = (data ?? {}) as Record<string, unknown>
  return {
    productionYearStart:
      row.productionYearStart == null ? null : Number(row.productionYearStart),
    productionYearEnd:
      row.productionYearEnd == null ? null : Number(row.productionYearEnd),
  }
}

export async function adminListVersions(modelId?: string): Promise<VehicleVersion[]> {
  let q = getSupabase()
    .from('vehicle_versions')
    .select('id, manufacturer_id, model_id, year, engine, version_name, status')
    .order('year', { ascending: false, nullsFirst: false })
  if (modelId) q = q.eq('model_id', modelId)
  const { data, error } = await q
  if (error) throw error
  return (data as VersionRow[]).map(mapVersion)
}

export async function adminUpsertVersion(input: {
  id?: string
  manufacturerId: string
  modelId: string
  year?: number | null
  engine?: string | null
  versionName?: string | null
  status?: VehicleVersion['status']
}): Promise<VehicleVersion> {
  const payload = {
    manufacturer_id: input.manufacturerId,
    model_id: input.modelId,
    year: input.year ?? null,
    engine: input.engine?.trim() || null,
    version_name: input.versionName?.trim() || null,
    status: input.status ?? 'active',
  }
  const q = getSupabase().from('vehicle_versions')
  const { data, error } = input.id
    ? await q.update(payload).eq('id', input.id).select().single()
    : await q.insert(payload).select().single()
  if (error) throw error
  return mapVersion(data as VersionRow)
}

export async function adminSetModelStatus(id: string, status: VehicleModel['status']) {
  const { error } = await getSupabase().from('models').update({ status }).eq('id', id)
  if (error) throw error
}

export async function adminSetVersionStatus(id: string, status: VehicleVersion['status']) {
  const { error } = await getSupabase().from('vehicle_versions').update({ status }).eq('id', id)
  if (error) throw error
}

export async function adminListDistinctVersionNames(filter?: {
  manufacturerId?: string
  modelId?: string
}): Promise<string[]> {
  let q = getSupabase()
    .from('vehicle_versions')
    .select('version_name')
    .not('version_name', 'is', null)
    .order('version_name')
  if (filter?.manufacturerId) q = q.eq('manufacturer_id', filter.manufacturerId)
  if (filter?.modelId) q = q.eq('model_id', filter.modelId)
  const { data, error } = await q
  if (error) throw error
  return [
    ...new Set(
      (data ?? [])
        .map((r) => String((r as { version_name: string | null }).version_name ?? '').trim())
        .filter(Boolean),
    ),
  ].sort((a, b) => a.localeCompare(b, 'pt-BR'))
}

export async function adminListDistinctEngines(filter?: {
  manufacturerId?: string
  modelId?: string
}): Promise<string[]> {
  let q = getSupabase()
    .from('vehicle_versions')
    .select('engine')
    .not('engine', 'is', null)
    .order('engine')
  if (filter?.manufacturerId) q = q.eq('manufacturer_id', filter.manufacturerId)
  if (filter?.modelId) q = q.eq('model_id', filter.modelId)
  const { data, error } = await q
  if (error) throw error
  return [
    ...new Set(
      (data ?? [])
        .map((r) => String((r as { engine: string | null }).engine ?? '').trim())
        .filter(Boolean),
    ),
  ].sort((a, b) => a.localeCompare(b, 'pt-BR'))
}
