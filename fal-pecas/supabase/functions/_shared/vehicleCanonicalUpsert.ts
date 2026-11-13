/**
 * Upsert canônico de veículo via RPC (Edge / service_role).
 */
import { assertModelClean } from './splitApiModelo.ts'

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

/** Re-split modelo composto antes de gravar no mestre. */
function cleanPlateFields(input: {
  maker: string
  model: string
  year?: string | number | null
  engine?: string | null
  version?: string | null
}) {
  const maker = String(input.maker ?? '').trim()
  const cleaned = assertModelClean(input.model, {
    engine: input.engine,
    version: input.version,
  })
  return {
    maker,
    model: cleaned.model,
    year: input.year,
    engine: cleaned.engine,
    version: cleaned.version,
  }
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
  const cleaned = cleanPlateFields(input)
  const maker = cleaned.maker
  const model = cleaned.model
  if (!maker || !model) throw new Error('maker_and_model_required')

  const { data, error } = await sb.rpc('upsert_vehicle_canonical', {
    p_maker: maker,
    p_model: model,
    p_year: parseYear(cleaned.year),
    p_engine: cleaned.engine,
    p_version: cleaned.version,
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
