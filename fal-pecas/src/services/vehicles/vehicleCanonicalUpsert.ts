import { getSupabase } from '@/lib/supabase'
import { normalizeVehicleFuel } from '@/lib/vehicles/normalizeVehicleFuel'
import { normalizeVehicleMasterInput } from '@/services/vehicles/normalizeVehicleMasterInput'

export type VehicleCanonicalSource = 'import' | 'plate' | 'admin'

export type VehicleCanonicalInput = {
  maker: string
  model: string
  year?: string | number | null
  engine?: string | null
  version?: string | null
  /** Admin/import only. Placa não envia (fica null → fuel_key ''). */
  fuel?: string | null
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
  fuel: string | null
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
 * Normaliza via normalizeVehicleMasterInput e grava só via RPC `upsert_vehicle_canonical` (fail closed: erro de RPC lança).
 */
export async function vehicleCanonicalUpsert(
  input: VehicleCanonicalInput,
): Promise<VehicleCanonicalResult> {
  const normalized = normalizeVehicleMasterInput({
    maker: input.maker,
    model: input.model,
    engine: input.engine,
    version: input.version,
  })
  if (normalized.outcome === 'reject') {
    throw new Error('maker_and_model_required')
  }
  // review: ainda grava, mas sempre com o modelo já limpo (nunca o texto bruto).
  const maker = normalized.maker
  const model = normalized.model
  const year = parseYear(input.year)
  // R2: ano obrigatório (paridade Edge) — evita VV aberta.
  if (year == null) {
    throw new Error('year_required_for_canonical_upsert')
  }
  const engine = blankToNull(normalized.engine)
  const version = blankToNull(normalized.version)
  const fuel = normalizeVehicleFuel(input.fuel)
  const source = input.source ?? 'admin'

  const sb = getSupabase()
  const { data, error } = await sb.rpc('upsert_vehicle_canonical', {
    p_maker: maker,
    p_model: model,
    p_year: year,
    p_engine: engine,
    p_version: version,
    p_source: source,
    p_fuel: fuel,
  })

  if (error) throw error
  if (!data || typeof data !== 'object') {
    throw new Error('upsert_vehicle_canonical_empty_response')
  }
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
    fuel: row.fuel == null || row.fuel === '' ? null : String(row.fuel),
  }
}
