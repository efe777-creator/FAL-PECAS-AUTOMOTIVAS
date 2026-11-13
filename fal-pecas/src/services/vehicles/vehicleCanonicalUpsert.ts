import { getSupabase } from '@/lib/supabase'
import {
  formatManufacturerDisplayName,
  formatModelDisplayName,
} from '@/lib/entityNormalize'
import { toSlug } from '@/lib/slug'
import {
  assertModelClean,
  normalizeVersionLabel,
  sanitizeEngine,
} from '@/services/plates/splitApiModelo'

export type VehicleCanonicalSource = 'import' | 'plate' | 'admin'

export type VehicleCanonicalInput = {
  maker: string
  model: string
  year?: string | number | null
  engine?: string | null
  version?: string | null
  source?: VehicleCanonicalSource
}

export type VehicleCanonicalResult = {
  manufacturerId: string
  modelId: string
  versionId: string
  maker: string
  model: string
  year: string | null
  engine: string | null
  version: string | null
}

function parseYear(year: string | number | null | undefined): number | null {
  if (year == null || year === '') return null
  const n = typeof year === 'number' ? year : Number(String(year).trim())
  if (!Number.isFinite(n) || n < 1950 || n > 2100) return null
  return Math.trunc(n)
}

function blankToNull(v: string | null | undefined): string | null {
  const t = (v ?? '').trim()
  return t ? t : null
}

/**
 * Find-or-create montadora/modelo/versão canônicos (anti-duplicidade).
 * Prefere RPC `upsert_vehicle_canonical`; fallback client-side se a migration ainda não estiver aplicada.
 */
export async function vehicleCanonicalUpsert(
  input: VehicleCanonicalInput,
): Promise<VehicleCanonicalResult> {
  const maker = formatManufacturerDisplayName(input.maker)
  const cleaned = assertModelClean(input.model, {
    engine: input.engine,
    version: input.version,
  })
  const model = formatModelDisplayName(cleaned.model)
  if (!maker || !model) {
    throw new Error('maker_and_model_required')
  }
  const year = parseYear(input.year)
  const engine = blankToNull(sanitizeEngine(cleaned.engine) ?? undefined)
  const version = blankToNull(normalizeVersionLabel(cleaned.version) ?? undefined)
  const source = input.source ?? 'admin'

  const sb = getSupabase()
  const { data, error } = await sb.rpc('upsert_vehicle_canonical', {
    p_maker: maker,
    p_model: model,
    p_year: year,
    p_engine: engine,
    p_version: version,
    p_source: source,
  })

  if (!error && data && typeof data === 'object') {
    const row = data as Record<string, unknown>
    return {
      manufacturerId: String(row.manufacturerId),
      modelId: String(row.modelId),
      versionId: String(row.versionId),
      maker: String(row.maker ?? maker),
      model: String(row.model ?? model),
      year: row.year == null || row.year === '' ? null : String(row.year),
      engine: row.engine == null || row.engine === '' ? null : String(row.engine),
      version: row.version == null || row.version === '' ? null : String(row.version),
    }
  }

  // Fallback sem RPC (ambientes sem migration)
  return vehicleCanonicalUpsertClient({ maker, model, year, engine, version, source })
}

async function vehicleCanonicalUpsertClient(input: {
  maker: string
  model: string
  year: number | null
  engine: string | null
  version: string | null
  source: VehicleCanonicalSource
}): Promise<VehicleCanonicalResult> {
  const sb = getSupabase()
  const makerSlug = toSlug(input.maker) || `maker-${Date.now()}`

  let { data: makerRow } = await sb
    .from('manufacturers')
    .select('id, name')
    .or(`slug.eq.${makerSlug},name.ilike.${input.maker}`)
    .limit(1)
    .maybeSingle()

  if (!makerRow) {
    const ins = await sb
      .from('manufacturers')
      .insert({ name: input.maker, slug: makerSlug, status: 'active' })
      .select('id, name')
      .single()
    if (ins.error) throw ins.error
    makerRow = ins.data
  }

  const modelSlug = toSlug(input.model) || `model-${Date.now()}`
  let { data: modelRow } = await sb
    .from('models')
    .select('id, name')
    .eq('manufacturer_id', makerRow.id)
    .or(`slug.eq.${modelSlug},name.ilike.${input.model}`)
    .limit(1)
    .maybeSingle()

  if (!modelRow) {
    const ins = await sb
      .from('models')
      .insert({
        manufacturer_id: makerRow.id,
        name: input.model,
        slug: modelSlug,
        status: 'active',
      })
      .select('id, name')
      .single()
    if (ins.error) throw ins.error
    modelRow = ins.data
  }

  let q = sb
    .from('vehicle_versions')
    .select('id, year, engine, version_name')
    .eq('manufacturer_id', makerRow.id)
    .eq('model_id', modelRow.id)
  q = input.year == null ? q.is('year', null) : q.eq('year', input.year)
  q = input.engine == null ? q.is('engine', null) : q.ilike('engine', input.engine)
  q =
    input.version == null
      ? q.is('version_name', null)
      : q.ilike('version_name', input.version)

  const { data: existing } = await q.limit(1).maybeSingle()

  if (existing) {
    await sb
      .from('vehicle_versions')
      .update({ status: 'active', updated_at: new Date().toISOString() })
      .eq('id', existing.id)
    const existingVersion =
      existing.version_name == null || String(existing.version_name).trim() === ''
        ? null
        : String(existing.version_name)
    return {
      manufacturerId: makerRow.id,
      modelId: modelRow.id,
      versionId: existing.id,
      maker: makerRow.name,
      model: modelRow.name,
      year: input.year == null ? null : String(input.year),
      engine: existing.engine ?? input.engine,
      version: existingVersion ?? input.version,
    }
  }

  const ins = await sb
    .from('vehicle_versions')
    .insert({
      manufacturer_id: makerRow.id,
      model_id: modelRow.id,
      year: input.year,
      engine: input.engine,
      version_name: input.version,
      status: 'active',
      source: input.source,
      updated_at: new Date().toISOString(),
    })
    .select('id')
    .single()
  if (ins.error) throw ins.error

  return {
    manufacturerId: makerRow.id,
    modelId: modelRow.id,
    versionId: ins.data.id,
    maker: makerRow.name,
    model: modelRow.name,
    year: input.year == null ? null : String(input.year),
    engine: input.engine,
    version: input.version,
  }
}
