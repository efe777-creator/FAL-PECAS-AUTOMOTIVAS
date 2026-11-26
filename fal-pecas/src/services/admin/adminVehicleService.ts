import { formatModelDisplayName, normalizeEntityMatchKey } from '@/lib/entityNormalize'
import {
  versionConfigGroupKey,
  versionNaturalKey,
} from '@/lib/vehicles/expandVersionYearRange'
import { normalizeVehicleFuel } from '@/lib/vehicles/normalizeVehicleFuel'
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
  fuel?: string | null
  status: string
}

const VERSION_SELECT =
  'id, manufacturer_id, model_id, year, engine, version_name, fuel, status'

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
    fuel: row.fuel ?? null,
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
  // Add manual: nasce verified (sem fila). Import/apps continuam review no writer SQL.
  // Update com nome “sujo” (outcome=review) pode rebaixar para review.
  const keepReview = normalized.outcome === 'review'

  const siblings = await adminListModels(input.manufacturerId)
  const dup = siblings.find(
    (m) =>
      m.id !== input.id &&
      m.status === 'active' &&
      normalizeEntityMatchKey(m.name) === normalizeEntityMatchKey(name),
  )
  if (dup) throw new Error(`Já existe modelo "${dup.name}" nesta montadora.`)

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
  // Update preserva quality_status salvo outcome=review (rebaixa).
  const updatePayload = keepReview ? { ...payload, quality_status: 'review' } : payload
  const insertPayload = {
    ...payload,
    quality_status: 'verified',
    vehicle_class: 'unknown',
    evidence_kind: 'admin_manual',
    review_note: keepReview
      ? 'Criado via admin manual; nome com resíduo — liberado (revisar se necessário)'
      : 'Criado via admin manual — liberado sem fila',
    reviewed_at: new Date().toISOString(),
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
  const saved = mapModel(data as ModelRow)

  // VV guarda manufacturer_id denormalizado — alinhar ao trocar montadora do modelo.
  if (input.id) {
    const { error: vvErr } = await getSupabase()
      .from('vehicle_versions')
      .update({ manufacturer_id: input.manufacturerId })
      .eq('model_id', input.id)
      .neq('manufacturer_id', input.manufacturerId)
    if (vvErr) throw vvErr
  }

  return saved
}

export type SetModelQualityInput = {
  modelId: string
  qualityStatus: 'review' | 'verified' | 'quarantined' | 'superseded'
  evidenceKind?: string | null
  evidenceUrl?: string | null
  reviewNote?: string | null
  canonicalModelId?: string | null
}

/**
 * Staff: promove/rebaixa qualidade via RPC.
 * verified: staff_override|master_api (sem URL) ou oem_a1|a2_concordant (+ URL).
 * Não inventa VV/PVC.
 */
export async function setModelQualityStatus(
  input: SetModelQualityInput,
): Promise<{ qualityStatus: string; evidenceKind: string | null }> {
  const { data, error } = await getSupabase().rpc('set_model_quality_status', {
    p_model_id: input.modelId,
    p_quality_status: input.qualityStatus,
    p_evidence_kind: input.evidenceKind ?? null,
    p_evidence_url: input.evidenceUrl ?? null,
    p_review_note: input.reviewNote ?? null,
    p_canonical_model_id: input.canonicalModelId ?? null,
  })
  if (error) throw error
  const row = (data ?? {}) as Record<string, unknown>
  return {
    qualityStatus: String(row.qualityStatus ?? input.qualityStatus),
    evidenceKind: row.evidenceKind == null ? null : String(row.evidenceKind),
  }
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
    .select(VERSION_SELECT)
    .order('year', { ascending: false, nullsFirst: false })
  if (modelId) q = q.eq('model_id', modelId)
  const { data, error } = await q
  if (error) throw error
  return (data as VersionRow[]).map(mapVersion)
}

function isUniqueViolation(err: unknown): boolean {
  if (!err || typeof err !== 'object') return false
  const o = err as { code?: string; message?: string }
  if (o.code === '23505') return true
  return /vehicle_versions_natural_uidx|duplicate key/i.test(String(o.message ?? ''))
}

/** Localiza VV pela chave natural (exato; se fuel setado, claim em fuel vazio). */
export async function adminFindVersionByNaturalKey(input: {
  manufacturerId: string
  modelId: string
  year?: number | null
  engine?: string | null
  versionName?: string | null
  fuel?: string | null
  /** Se true (default), com fuel informado tenta linha sem fuel (placa). */
  claimEmptyFuel?: boolean
}): Promise<VehicleVersion | null> {
  const year = input.year ?? null
  const eng = input.engine?.trim() || null
  const ver = input.versionName?.trim() || null
  const fuel = normalizeVehicleFuel(input.fuel)
  const fuelKey = (fuel ?? '').toLowerCase()
  const base = () =>
    getSupabase()
      .from('vehicle_versions')
      .select(VERSION_SELECT)
      .eq('manufacturer_id', input.manufacturerId)
      .eq('model_id', input.modelId)
      .eq('year_key', year == null ? -1 : year)
      .eq('engine_key', (eng ?? '').toLowerCase())
      .eq('version_key', (ver ?? '').toLowerCase())

  const exact = await base().eq('fuel_key', fuelKey).limit(1).maybeSingle()
  if (exact.error) throw exact.error
  if (exact.data) return mapVersion(exact.data as VersionRow)

  if (fuel && input.claimEmptyFuel !== false) {
    const empty = await base().eq('fuel_key', '').limit(1).maybeSingle()
    if (empty.error) throw empty.error
    if (empty.data) return mapVersion(empty.data as VersionRow)
  }
  return null
}

/**
 * Upsert idempotente por id ou chave natural — reativa em vez de duplicar
 * (`vehicle_versions_natural_uidx`).
 */
export async function adminUpsertVersion(input: {
  id?: string
  manufacturerId: string
  modelId: string
  year?: number | null
  engine?: string | null
  versionName?: string | null
  fuel?: string | null
  status?: VehicleVersion['status']
}): Promise<VehicleVersion> {
  const fuel = normalizeVehicleFuel(input.fuel)
  const payload = {
    manufacturer_id: input.manufacturerId,
    model_id: input.modelId,
    year: input.year ?? null,
    engine: input.engine?.trim() || null,
    version_name: input.versionName?.trim() || null,
    fuel,
    status: input.status ?? 'active',
  }
  const sb = getSupabase().from('vehicle_versions')

  async function updateById(id: string): Promise<VehicleVersion> {
    const { data, error } = await sb.update(payload).eq('id', id).select(VERSION_SELECT).single()
    if (!error) return mapVersion(data as VersionRow)
    if (!isUniqueViolation(error)) throw error
    const winner = await adminFindVersionByNaturalKey({
      manufacturerId: payload.manufacturer_id,
      modelId: payload.model_id,
      year: payload.year,
      engine: payload.engine,
      versionName: payload.version_name,
      fuel: payload.fuel,
      claimEmptyFuel: false,
    })
    if (!winner || winner.id === id) throw error
    const { data: revived, error: revErr } = await sb
      .update({
        status: payload.status,
        manufacturer_id: payload.manufacturer_id,
        fuel: payload.fuel,
      })
      .eq('id', winner.id)
      .select(VERSION_SELECT)
      .single()
    if (revErr) throw revErr
    if (id !== winner.id) {
      await sb.update({ status: 'inactive' }).eq('id', id)
    }
    return mapVersion(revived as VersionRow)
  }

  if (input.id) return updateById(input.id)

  const found = await adminFindVersionByNaturalKey({
    manufacturerId: payload.manufacturer_id,
    modelId: payload.model_id,
    year: payload.year,
    engine: payload.engine,
    versionName: payload.version_name,
    fuel: payload.fuel,
  })
  if (found) return updateById(found.id)

  const { data, error } = await sb.insert(payload).select(VERSION_SELECT).single()
  if (!error) return mapVersion(data as VersionRow)
  if (!isUniqueViolation(error)) throw error
  const raced = await adminFindVersionByNaturalKey({
    manufacturerId: payload.manufacturer_id,
    modelId: payload.model_id,
    year: payload.year,
    engine: payload.engine,
    versionName: payload.version_name,
    fuel: payload.fuel,
  })
  if (!raced) throw error
  return updateById(raced.id)
}

/**
 * Cria/reativa 1 VV por ano do intervalo. Idempotente na chave natural.
 */
export async function adminUpsertVersionYearRange(input: {
  manufacturerId: string
  modelId: string
  years: number[]
  engine?: string | null
  versionName?: string | null
  fuel?: string | null
  status?: VehicleVersion['status']
  /** VVs já carregadas do modelo (para skip sem round-trip). */
  existing?: VehicleVersion[]
}): Promise<{ created: number; skipped: number; years: number[] }> {
  const eng = input.engine?.trim() || null
  const ver = input.versionName?.trim() || null
  const fuel = normalizeVehicleFuel(input.fuel)
  const existing = input.existing ?? (await adminListVersions(input.modelId))
  const byKey = new Map(
    existing.map((v) => [
      versionNaturalKey({
        year: v.year,
        engine: v.engine,
        versionName: v.versionName,
        fuel: v.fuel,
      }),
      v,
    ]),
  )
  let created = 0
  let skipped = 0
  const wantStatus = input.status ?? 'active'
  for (const year of input.years) {
    const key = versionNaturalKey({ year, engine: eng, versionName: ver, fuel })
    const hit =
      byKey.get(key) ??
      (fuel
        ? existing.find(
            (v) =>
              v.year === year &&
              versionNaturalKey({
                year: v.year,
                engine: v.engine,
                versionName: v.versionName,
                fuel: null,
              }) === versionNaturalKey({ year, engine: eng, versionName: ver, fuel: null }),
          )
        : undefined)
    if (hit) {
      const needsFuel = fuel != null && (hit.fuel ?? null) !== fuel
      if (hit.status !== wantStatus || needsFuel) {
        await adminUpsertVersion({
          id: hit.id,
          manufacturerId: input.manufacturerId,
          modelId: input.modelId,
          year,
          engine: eng,
          versionName: ver,
          fuel,
          status: wantStatus,
        })
        created += 1
      } else {
        skipped += 1
      }
      continue
    }
    const saved = await adminUpsertVersion({
      manufacturerId: input.manufacturerId,
      modelId: input.modelId,
      year,
      engine: eng,
      versionName: ver,
      fuel,
      status: wantStatus,
    })
    byKey.set(key, saved)
    created += 1
  }
  return { created, skipped, years: input.years }
}

/**
 * Reconcilia período (+ opcionalmente motor/versão/combustível) de uma família:
 * atualiza identidade no lugar (preserva id/PVC), cria anos faltantes,
 * reativa no intervalo e inativa fora. `sourceGroupKey` = família em edição.
 */
export async function adminReconcileVersionYearRange(input: {
  manufacturerId: string
  modelId: string
  years: number[]
  engine?: string | null
  versionName?: string | null
  fuel?: string | null
  /** Chave da família que está sendo editada (`versionConfigGroupKey`). */
  sourceGroupKey?: string
  existing?: VehicleVersion[]
}): Promise<{
  created: number
  reactivated: number
  inactivated: number
  skipped: number
  renamed: number
}> {
  const eng = input.engine?.trim() || null
  const ver = input.versionName?.trim() || null
  const fuel = normalizeVehicleFuel(input.fuel)
  const toKey = versionConfigGroupKey({ engine: eng, versionName: ver, fuel })
  const fromKey = input.sourceGroupKey ?? toKey
  const identityChanged = fromKey !== toKey
  const existing = input.existing ?? (await adminListVersions(input.modelId))
  const family = existing.filter((v) => versionConfigGroupKey(v) === fromKey)
  const targetOthers = identityChanged
    ? existing.filter((v) => versionConfigGroupKey(v) === toKey)
    : []
  const want = new Set(input.years)
  let created = 0
  let reactivated = 0
  let inactivated = 0
  let skipped = 0
  let renamed = 0

  for (const year of input.years) {
    const sourceRow = family.find((v) => v.year === year)
    const conflict = identityChanged
      ? targetOthers.find((v) => v.year === year)
      : undefined

    if (sourceRow && conflict && conflict.id !== sourceRow.id) {
      if (conflict.status === 'inactive') {
        await adminUpsertVersion({
          id: conflict.id,
          manufacturerId: input.manufacturerId,
          modelId: input.modelId,
          year,
          engine: eng,
          versionName: ver,
          fuel,
          status: 'active',
        })
        reactivated += 1
      } else {
        skipped += 1
      }
      if (sourceRow.status === 'active') {
        await adminSetVersionStatus(sourceRow.id, 'inactive')
        inactivated += 1
      }
      continue
    }

    if (sourceRow) {
      const needsRename =
        identityChanged ||
        (sourceRow.engine ?? null) !== eng ||
        (sourceRow.versionName ?? null) !== ver ||
        (sourceRow.fuel ?? null) !== fuel
      if (needsRename || sourceRow.status === 'inactive') {
        await adminUpsertVersion({
          id: sourceRow.id,
          manufacturerId: input.manufacturerId,
          modelId: input.modelId,
          year,
          engine: eng,
          versionName: ver,
          fuel,
          status: 'active',
        })
        if (needsRename) renamed += 1
        else reactivated += 1
      } else {
        skipped += 1
      }
      continue
    }

    if (conflict) {
      if (conflict.status === 'inactive') {
        await adminSetVersionStatus(conflict.id, 'active')
        reactivated += 1
      } else {
        skipped += 1
      }
      continue
    }

    await adminUpsertVersion({
      manufacturerId: input.manufacturerId,
      modelId: input.modelId,
      year,
      engine: eng,
      versionName: ver,
      fuel,
      status: 'active',
    })
    created += 1
  }

  for (const row of family) {
    if (row.year == null || want.has(row.year)) continue
    const needsRename =
      identityChanged ||
      (row.engine ?? null) !== eng ||
      (row.versionName ?? null) !== ver ||
      (row.fuel ?? null) !== fuel
    if (needsRename || row.status === 'active') {
      await adminUpsertVersion({
        id: row.id,
        manufacturerId: input.manufacturerId,
        modelId: input.modelId,
        year: row.year,
        engine: eng,
        versionName: ver,
        fuel,
        status: 'inactive',
      })
      if (row.status === 'active') inactivated += 1
      else if (needsRename) renamed += 1
    }
  }

  return { created, reactivated, inactivated, skipped, renamed }
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
