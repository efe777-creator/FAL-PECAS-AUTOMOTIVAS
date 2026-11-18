import { getSupabase } from '@/lib/supabase'
import { getCurrentCustomerId } from '@/services/customers/customerService'
import type { CustomerSavedVehicle, VehicleFilter } from '@/types'

type Row = {
  id: string
  customer_id: string
  manufacturer_id: string | null
  model_id: string | null
  version_id: string | null
  year: number | null
  engine: string | null
  nickname: string | null
  is_primary: boolean
  maker_text?: string | null
  model_text?: string | null
  version_text?: string | null
  engine_text?: string | null
  plate?: string | null
  manufacturers?: { name: string } | { name: string }[] | null
  models?: { name: string } | { name: string }[] | null
  vehicle_versions?:
    | { version_name: string | null; year: number | null; engine: string | null }
    | { version_name: string | null; year: number | null; engine: string | null }[]
    | null
}

const SELECT_VEHICLE = `
  id, customer_id, manufacturer_id, model_id, version_id, year, engine, nickname, is_primary,
  maker_text, model_text, version_text, engine_text, plate,
  manufacturers ( name ),
  models ( name ),
  vehicle_versions ( version_name, year, engine )
`

function relName(value: unknown): string | undefined {
  if (!value) return undefined
  if (Array.isArray(value)) return (value[0] as { name?: string } | undefined)?.name
  return (value as { name?: string }).name
}

function blankToNull(v: string | null | undefined): string | null {
  const t = (v ?? '').trim()
  return t ? t : null
}

function mapVehicle(row: Row): CustomerSavedVehicle {
  const vv = Array.isArray(row.vehicle_versions) ? row.vehicle_versions[0] : row.vehicle_versions
  return {
    id: String(row.id),
    customerId: String(row.customer_id),
    manufacturerId: row.manufacturer_id,
    modelId: row.model_id,
    versionId: row.version_id ? String(row.version_id) : null,
    year: row.year ?? vv?.year ?? null,
    engine: row.engine ?? vv?.engine ?? row.engine_text ?? null,
    nickname: row.nickname,
    isPrimary: Boolean(row.is_primary),
    plate: row.plate ?? null,
    makerName: relName(row.manufacturers) ?? row.maker_text ?? undefined,
    modelName: relName(row.models) ?? row.model_text ?? undefined,
    versionName: vv?.version_name ?? row.version_text ?? null,
  }
}

export async function listSavedVehicles(): Promise<CustomerSavedVehicle[]> {
  const customerId = await getCurrentCustomerId()
  if (!customerId) return []
  const { data, error } = await getSupabase()
    .from('customer_vehicles')
    .select(SELECT_VEHICLE)
    .eq('customer_id', customerId)
    .order('is_primary', { ascending: false })
    .order('created_at', { ascending: false })
  if (error) throw error
  return (data as Row[]).map(mapVehicle)
}

export type ResolvedGarageIdentity = {
  versionId: string | null
  manufacturerId: string | null
  modelId: string | null
  year: number | null
  engine: string | null
  ambiguous?: boolean
}

/**
 * Resolve identidade canônica para a garagem.
 * Sem motor/versão informados: não inventa; se vários VV do mesmo maker+model,
 * prefere linha com version_name e engine nulos; se ainda ambíguo, retorna FKs de
 * maker/model sem versionId (ambiguous).
 */
export async function resolveVersionId(input: {
  maker: string
  model: string
  year?: string
  engine?: string
  version?: string
}): Promise<ResolvedGarageIdentity | null> {
  const sb = getSupabase()
  let q = sb
    .from('vehicle_versions')
    .select(
      'id, manufacturer_id, model_id, year, engine, version_name, manufacturers!inner(name), models!inner(name)',
    )
    .eq('status', 'active')

  if (input.year?.trim()) q = q.eq('year', Number(input.year))
  if (input.engine?.trim()) q = q.eq('engine', input.engine.trim())
  if (input.version?.trim()) q = q.eq('version_name', input.version.trim())

  const { data, error } = await q
  if (error) throw error

  const matches = (data ?? []).filter((v) => {
    const maker = relName(v.manufacturers)
    const model = relName(v.models)
    return (
      maker?.toLowerCase() === input.maker.toLowerCase() &&
      model?.toLowerCase() === input.model.toLowerCase()
    )
  })

  if (!matches.length) {
    const ids = await resolveManufacturerModelIds(input.maker, input.model)
    if (!ids) return null
    return {
      versionId: null,
      manufacturerId: ids.manufacturerId,
      modelId: ids.modelId,
      year: input.year?.trim() ? Number(input.year) : null,
      engine: blankToNull(input.engine),
    }
  }

  if (matches.length === 1) {
    const match = matches[0]!
    return {
      versionId: String(match.id),
      manufacturerId: String(match.manufacturer_id),
      modelId: String(match.model_id),
      year: match.year == null ? null : Number(match.year),
      engine: (match.engine as string | null) ?? blankToNull(input.engine),
    }
  }

  const open = matches.filter(
    (m) =>
      (m.version_name == null || String(m.version_name).trim() === '') &&
      (m.engine == null || String(m.engine).trim() === ''),
  )
  const pick = open.length === 1 ? open[0]! : null
  if (pick) {
    return {
      versionId: String(pick.id),
      manufacturerId: String(pick.manufacturer_id),
      modelId: String(pick.model_id),
      year: pick.year == null ? null : Number(pick.year),
      engine: blankToNull(input.engine),
    }
  }

  const first = matches[0]!
  return {
    versionId: null,
    manufacturerId: String(first.manufacturer_id),
    modelId: String(first.model_id),
    year: input.year?.trim() ? Number(input.year) : first.year == null ? null : Number(first.year),
    engine: blankToNull(input.engine),
    ambiguous: true,
  }
}

async function resolveManufacturerModelIds(
  maker: string,
  model: string,
): Promise<{ manufacturerId: string; modelId: string } | null> {
  const sb = getSupabase()
  const { data: makers, error: mErr } = await sb
    .from('manufacturers')
    .select('id, name')
    .eq('status', 'active')
    .ilike('name', maker.trim())
    .limit(5)
  if (mErr) throw mErr
  const makerRow = (makers ?? []).find((m) => m.name?.toLowerCase() === maker.trim().toLowerCase())
  if (!makerRow?.id) return null

  const { data: models, error: moErr } = await sb
    .from('models')
    .select('id, name')
    .eq('manufacturer_id', makerRow.id)
    .eq('status', 'active')
    .ilike('name', model.trim())
    .limit(5)
  if (moErr) throw moErr
  const modelRow = (models ?? []).find((m) => m.name?.toLowerCase() === model.trim().toLowerCase())
  if (!modelRow?.id) return null
  return { manufacturerId: String(makerRow.id), modelId: String(modelRow.id) }
}

export async function addSavedVehicle(input: {
  versionId?: string | null
  manufacturerId?: string | null
  modelId?: string | null
  year?: number | null
  engine?: string | null
  nickname?: string | null
  isPrimary?: boolean
  makerText?: string | null
  modelText?: string | null
  versionText?: string | null
  engineText?: string | null
  plate?: string | null
}): Promise<CustomerSavedVehicle> {
  const customerId = await getCurrentCustomerId()
  if (!customerId) throw new Error('Cliente não encontrado')

  const makerText = blankToNull(input.makerText)
  const modelText = blankToNull(input.modelText)
  if (!makerText || !modelText) {
    throw new Error('Informe montadora e modelo para salvar o veículo.')
  }

  if (input.isPrimary) {
    await getSupabase()
      .from('customer_vehicles')
      .update({ is_primary: false })
      .eq('customer_id', customerId)
  }

  const { data, error } = await getSupabase()
    .from('customer_vehicles')
    .insert({
      customer_id: customerId,
      version_id: input.versionId ?? null,
      manufacturer_id: input.manufacturerId ?? null,
      model_id: input.modelId ?? null,
      year: input.year ?? null,
      engine: blankToNull(input.engine ?? undefined),
      nickname: input.nickname?.trim() || null,
      is_primary: Boolean(input.isPrimary),
      maker_text: makerText,
      model_text: modelText,
      version_text: blankToNull(input.versionText),
      engine_text: blankToNull(input.engineText),
      plate: blankToNull(input.plate),
    })
    .select(SELECT_VEHICLE)
    .single()
  if (error) throw error
  return mapVehicle(data as Row)
}

/**
 * Salva na garagem com o que se sabe: IDs da placa → resolve → parcial sem version_id.
 * Não cria versão fictícia. Exige maker + model textuais.
 */
export async function ensureSavedVehicleFromFilter(
  filter: VehicleFilter & { nickname?: string | null; isPrimary?: boolean },
): Promise<CustomerSavedVehicle> {
  const maker = filter.maker?.trim()
  const model = filter.model?.trim()
  if (!maker || !model) {
    throw new Error('Informe montadora e modelo para salvar o veículo.')
  }

  const yearNum = filter.year?.trim() ? Number(filter.year) : null
  const engine = blankToNull(filter.engine)
  const versionText = blankToNull(filter.version) ?? blankToNull(filter.versionRaw)
  const engineText = blankToNull(filter.engineRaw)
  const plate = blankToNull(filter.plate)

  let versionId = blankToNull(filter.versionId)
  let manufacturerId = blankToNull(filter.manufacturerId)
  let modelId = blankToNull(filter.modelId)
  let year = Number.isFinite(yearNum as number) ? yearNum : null
  let resolvedEngine = engine

  if (versionId && manufacturerId && modelId) {
    // IDs da placa consistentes — usar direto
  } else {
    const resolved = await resolveVersionId({
      maker,
      model,
      year: filter.year,
      engine: filter.engine,
      version: filter.version,
    })
    if (resolved) {
      versionId = resolved.versionId
      manufacturerId = resolved.manufacturerId
      modelId = resolved.modelId
      year = resolved.year ?? year
      resolvedEngine = resolved.engine ?? resolvedEngine
    }
  }

  const existing = await listSavedVehicles()
  return addSavedVehicle({
    versionId,
    manufacturerId,
    modelId,
    year,
    engine: resolvedEngine,
    nickname: filter.nickname,
    isPrimary: filter.isPrimary ?? existing.length === 0,
    makerText: maker,
    modelText: model,
    versionText,
    engineText,
    plate,
  })
}

export async function removeSavedVehicle(id: string): Promise<void> {
  const customerId = await getCurrentCustomerId()
  if (!customerId) throw new Error('Cliente não encontrado')
  const { error } = await getSupabase()
    .from('customer_vehicles')
    .delete()
    .eq('id', id)
    .eq('customer_id', customerId)
  if (error) throw error
}

export async function setPrimaryVehicle(id: string): Promise<void> {
  const customerId = await getCurrentCustomerId()
  if (!customerId) throw new Error('Cliente não encontrado')
  const sb = getSupabase()
  const { error: clearErr } = await sb
    .from('customer_vehicles')
    .update({ is_primary: false })
    .eq('customer_id', customerId)
  if (clearErr) throw clearErr
  const { error } = await sb
    .from('customer_vehicles')
    .update({ is_primary: true })
    .eq('id', id)
    .eq('customer_id', customerId)
  if (error) throw error
}
