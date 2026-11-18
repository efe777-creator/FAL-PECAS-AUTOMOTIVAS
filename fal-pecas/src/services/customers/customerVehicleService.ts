import { getSupabase } from '@/lib/supabase'
import { getCurrentCustomerId } from '@/services/customers/customerService'
import { vehicleIdentityFalCode } from '@/services/garage/vehicleIdentityDisplay'
import { normalizePlate } from '@/services/plates/plateNormalize'
import { parsePlateSourceSnapshot } from '@/services/plates/plateSourceSnapshot'
import type { CustomerSavedVehicle, CustomerVehicleSourceSnapshot, VehicleFilter } from '@/types'

type Row = {
  id: string
  customer_id: string
  vehicle_identity_id?: string | null
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
  plate_normalized?: string | null
  color_hex?: string | null
  color_label?: string | null
  notes?: string | null
  primary_asset_id?: string | null
  source_snapshot?: unknown
  manufacturers?: { name: string } | { name: string }[] | null
  models?: { name: string } | { name: string }[] | null
  vehicle_versions?:
    | { version_name: string | null; year: number | null; engine: string | null }
    | { version_name: string | null; year: number | null; engine: string | null }[]
    | null
}

const SELECT_VEHICLE = `
  id, customer_id, vehicle_identity_id, manufacturer_id, model_id, version_id, year, engine, nickname, is_primary,
  maker_text, model_text, version_text, engine_text, plate, plate_normalized,
  color_hex, color_label, notes, primary_asset_id, source_snapshot,
  manufacturers ( name ),
  models ( name ),
  vehicle_versions ( version_name, year, engine )
`

/** Placa para unique/dedup: só alfanumérico upper; vazio → null. */
export function plateNormalizedOrNull(raw: string | null | undefined): string | null {
  const n = normalizePlate(raw ?? '')
  return n ? n : null
}

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
  const vehicleIdentityId = row.vehicle_identity_id ? String(row.vehicle_identity_id) : null
  return {
    id: String(row.id),
    customerId: String(row.customer_id),
    vehicleIdentityId,
    falCode: vehicleIdentityFalCode(vehicleIdentityId),
    manufacturerId: row.manufacturer_id,
    modelId: row.model_id,
    versionId: row.version_id ? String(row.version_id) : null,
    year: row.year ?? vv?.year ?? null,
    engine: row.engine ?? vv?.engine ?? row.engine_text ?? null,
    nickname: row.nickname,
    isPrimary: Boolean(row.is_primary),
    plate: row.plate ?? null,
    colorHex: row.color_hex ?? null,
    colorLabel: row.color_label ?? null,
    notes: row.notes ?? null,
    primaryAssetId: row.primary_asset_id ? String(row.primary_asset_id) : null,
    makerName: relName(row.manufacturers) ?? row.maker_text ?? undefined,
    modelName: relName(row.models) ?? row.model_text ?? undefined,
    versionName: vv?.version_name ?? row.version_text ?? null,
    sourceSnapshot: parsePlateSourceSnapshot(row.source_snapshot),
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

export async function getSavedVehicle(id: string): Promise<CustomerSavedVehicle | null> {
  const customerId = await getCurrentCustomerId()
  if (!customerId) return null
  const { data, error } = await getSupabase()
    .from('customer_vehicles')
    .select(SELECT_VEHICLE)
    .eq('id', id)
    .eq('customer_id', customerId)
    .maybeSingle()
  if (error) throw error
  return data ? mapVehicle(data as Row) : null
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
  sourceSnapshot?: CustomerVehicleSourceSnapshot | null
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

  const plate = blankToNull(input.plate)
  const plateNorm = plateNormalizedOrNull(plate)

  // PLANO 2A E1: identity + ownership + membership atômicos (RPC).
  const { data, error } = await getSupabase().rpc('create_customer_vehicle_with_identity', {
    p_manufacturer_id: input.manufacturerId ?? null,
    p_model_id: input.modelId ?? null,
    p_version_id: input.versionId ?? null,
    p_year: input.year ?? null,
    p_engine: blankToNull(input.engine ?? undefined),
    p_nickname: input.nickname?.trim() || null,
    p_is_primary: Boolean(input.isPrimary),
    p_maker_text: makerText,
    p_model_text: modelText,
    p_version_text: blankToNull(input.versionText),
    p_engine_text: blankToNull(input.engineText),
    p_plate: plate,
    p_plate_normalized: plateNorm,
    p_source_snapshot: input.sourceSnapshot ?? null,
  })
  if (error) throw error
  const insertedId = (data as { id?: string } | null)?.id
  if (!insertedId) throw new Error('Falha ao criar veículo com identidade.')
  const full = await getSavedVehicle(insertedId)
  if (!full) throw new Error('Veículo criado mas não encontrado.')
  return full
}

export async function updateSavedVehicle(
  id: string,
  input: {
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
    colorHex?: string | null
    colorLabel?: string | null
    notes?: string | null
    primaryAssetId?: string | null
    sourceSnapshot?: CustomerVehicleSourceSnapshot | null
  },
): Promise<CustomerSavedVehicle> {
  const customerId = await getCurrentCustomerId()
  if (!customerId) throw new Error('Cliente não encontrado')

  const patch: Record<string, unknown> = {}
  if (input.makerText !== undefined) {
    const makerText = blankToNull(input.makerText)
    if (!makerText) throw new Error('Informe montadora e modelo para salvar o veículo.')
    patch.maker_text = makerText
  }
  if (input.modelText !== undefined) {
    const modelText = blankToNull(input.modelText)
    if (!modelText) throw new Error('Informe montadora e modelo para salvar o veículo.')
    patch.model_text = modelText
  }
  if (input.versionId !== undefined) patch.version_id = input.versionId
  if (input.manufacturerId !== undefined) patch.manufacturer_id = input.manufacturerId
  if (input.modelId !== undefined) patch.model_id = input.modelId
  if (input.year !== undefined) patch.year = input.year
  if (input.engine !== undefined) patch.engine = blankToNull(input.engine)
  if (input.nickname !== undefined) patch.nickname = input.nickname?.trim() || null
  if (input.versionText !== undefined) patch.version_text = blankToNull(input.versionText)
  if (input.engineText !== undefined) patch.engine_text = blankToNull(input.engineText)
  if (input.plate !== undefined) {
    const plate = blankToNull(input.plate)
    patch.plate = plate
    patch.plate_normalized = plateNormalizedOrNull(plate)
  }
  if (input.colorHex !== undefined) {
    const hex = blankToNull(input.colorHex)
    if (hex && !/^#[0-9A-Fa-f]{6}$/.test(hex)) {
      throw new Error('Cor inválida. Use o formato #RRGGBB.')
    }
    patch.color_hex = hex ? hex.toUpperCase() : null
  }
  if (input.colorLabel !== undefined) patch.color_label = blankToNull(input.colorLabel)
  if (input.notes !== undefined) patch.notes = blankToNull(input.notes)
  if (input.primaryAssetId !== undefined) patch.primary_asset_id = input.primaryAssetId
  if (input.sourceSnapshot !== undefined) {
    patch.source_snapshot = input.sourceSnapshot
  }

  if (input.isPrimary) {
    await getSupabase()
      .from('customer_vehicles')
      .update({ is_primary: false })
      .eq('customer_id', customerId)
    patch.is_primary = true
  }

  if (Object.keys(patch).length === 0) {
    const { data, error } = await getSupabase()
      .from('customer_vehicles')
      .select(SELECT_VEHICLE)
      .eq('id', id)
      .eq('customer_id', customerId)
      .single()
    if (error) throw error
    return mapVehicle(data as Row)
  }

  const { data, error } = await getSupabase()
    .from('customer_vehicles')
    .update(patch)
    .eq('id', id)
    .eq('customer_id', customerId)
    .select(SELECT_VEHICLE)
    .single()
  if (error) throw error
  const mapped = mapVehicle(data as Row)

  // Espelha attrs públicos na identity (owner vigente via RLS).
  if (mapped.vehicleIdentityId) {
    const identityPatch: Record<string, unknown> = {}
    if (input.manufacturerId !== undefined) identityPatch.manufacturer_id = input.manufacturerId
    if (input.modelId !== undefined) identityPatch.model_id = input.modelId
    if (input.versionId !== undefined) identityPatch.version_id = input.versionId
    if (input.year !== undefined) identityPatch.year = input.year
    if (input.makerText !== undefined) identityPatch.maker_text = blankToNull(input.makerText)
    if (input.modelText !== undefined) identityPatch.model_text = blankToNull(input.modelText)
    if (input.versionText !== undefined) identityPatch.version_text = blankToNull(input.versionText)
    if (input.engineText !== undefined) identityPatch.engine_text = blankToNull(input.engineText)
    if (input.engine !== undefined && input.engineText === undefined) {
      identityPatch.engine_text = blankToNull(input.engine)
    }
    if (input.plate !== undefined) {
      const plate = blankToNull(input.plate)
      identityPatch.plate_current = plate
      identityPatch.plate_normalized_current = plateNormalizedOrNull(plate)
    }
    if (Object.keys(identityPatch).length > 0) {
      const { error: idErr } = await getSupabase()
        .from('vehicle_identities')
        .update(identityPatch)
        .eq('id', mapped.vehicleIdentityId)
      if (idErr) throw idErr
    }
  }

  return mapped
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
  const plateNorm = plateNormalizedOrNull(plate)
  const dup =
    plateNorm != null
      ? existing.find((v) => plateNormalizedOrNull(v.plate) === plateNorm)
      : undefined

  const payload = {
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
    sourceSnapshot: filter.sourceSnapshot ?? null,
  }

  if (dup) {
    return updateSavedVehicle(dup.id, {
      ...payload,
      isPrimary: filter.isPrimary ?? dup.isPrimary,
    })
  }

  return addSavedVehicle(payload)
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
