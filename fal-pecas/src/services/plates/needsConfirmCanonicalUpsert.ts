import type { VehicleFilter } from '@/types'

/** R4: re-upsert mestre só com ano e quando IDs faltam ou o ano divergiu do lookup. */
export function needsConfirmCanonicalUpsert(
  filter: VehicleFilter,
  lookupYear?: string | number | null,
): boolean {
  const maker = (filter.maker ?? '').trim()
  const model = (filter.model ?? '').trim()
  const year = filter.year == null ? '' : String(filter.year).trim()
  if (!maker || !model || !year) return false

  if (!filter.versionId || !filter.manufacturerId || !filter.modelId) return true

  if (lookupYear != null && String(lookupYear).trim() !== '' && String(lookupYear).trim() !== year) {
    return true
  }

  return false
}
