import { getSupabase } from '@/lib/supabase'
import type { VehicleFilter } from '@/types'

type ConfirmUpsertResponse = {
  ok?: boolean
  manufacturerId?: string
  modelId?: string
  versionId?: string
  maker?: string
  model?: string
  year?: string | null
  engine?: string | null
  version?: string | null
  error?: string
}

/** Chama Edge autenticada vehicle-confirm-upsert e mescla IDs no filter. */
export async function confirmVehicleCanonicalUpsert(
  filter: VehicleFilter,
): Promise<VehicleFilter> {
  const { data, error } = await getSupabase().functions.invoke('vehicle-confirm-upsert', {
    body: {
      maker: filter.maker,
      model: filter.model,
      year: filter.year,
      engine: filter.engine ?? null,
      version: filter.version ?? null,
    },
  })

  if (error) throw error
  const payload = data as ConfirmUpsertResponse | null
  if (!payload?.ok || !payload.manufacturerId || !payload.modelId || !payload.versionId) {
    throw new Error(payload?.error ?? 'confirm_upsert_failed')
  }

  return {
    ...filter,
    maker: payload.maker ?? filter.maker,
    model: payload.model ?? filter.model,
    year: payload.year ?? filter.year,
    engine: payload.engine ?? filter.engine,
    version: payload.version ?? filter.version,
    manufacturerId: payload.manufacturerId,
    modelId: payload.modelId,
    versionId: payload.versionId,
  }
}
