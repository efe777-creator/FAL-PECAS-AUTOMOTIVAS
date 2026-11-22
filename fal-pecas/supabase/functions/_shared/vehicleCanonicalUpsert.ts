/**
 * Upsert canônico de veículo via RPC (Edge / service_role).
 */
import { normalizeVehicleMasterInput } from './normalizeVehicleMasterInput.ts'

export type CanonicalUpsertResult = {
  manufacturerId: string
  modelId: string
  versionId: string
  maker: string
  model: string
  year: string | null
  engine: string | null
  version: string | null
}

type Sb = {
  rpc: (
    fn: string,
    args: Record<string, unknown>,
  ) => Promise<{ data: unknown; error: { message: string } | null }>
}

function parseYear(year: string | number | null | undefined): number | null {
  if (year == null || year === '') return null
  const n = typeof year === 'number' ? year : Number(String(year).trim())
  if (!Number.isFinite(n) || n < 1950 || n > 2100) return null
  return Math.trunc(n)
}

export async function vehicleCanonicalUpsert(
  sb: Sb,
  input: {
    maker: string
    model: string
    year?: string | number | null
    engine?: string | null
    version?: string | null
    source?: 'import' | 'plate' | 'admin'
  },
): Promise<CanonicalUpsertResult> {
  const normalized = normalizeVehicleMasterInput({
    maker: input.maker,
    model: input.model,
    engine: input.engine,
    version: input.version,
  })
  if (normalized.outcome === 'reject') throw new Error('maker_and_model_required')
  // review: ainda grava, sempre com o modelo já limpo.
  const maker = normalized.maker
  const model = normalized.model
  // R2: não criar VV “aberta” sem ano no mestre.
  const yearNum = parseYear(input.year)
  if (yearNum == null) throw new Error('year_required_for_canonical_upsert')

  const { data, error } = await sb.rpc('upsert_vehicle_canonical', {
    p_maker: maker,
    p_model: model,
    p_year: yearNum,
    p_engine: normalized.engine,
    p_version: normalized.version,
    p_source: input.source ?? 'plate',
  })

  if (error) throw new Error(error.message)
  const row = (data ?? {}) as Record<string, unknown>
  return {
    manufacturerId: String(row.manufacturerId ?? ''),
    modelId: String(row.modelId ?? ''),
    versionId: String(row.versionId ?? ''),
    maker: String(row.maker ?? maker),
    model: String(row.model ?? model),
    year: row.year == null || row.year === '' ? null : String(row.year),
    engine: row.engine == null || row.engine === '' ? null : String(row.engine),
    version: row.version == null || row.version === '' ? null : String(row.version),
  }
}
