import { getSupabase } from '@/lib/supabase'
import { adminInsertAttributeEvidence } from '@/services/admin/adminVehicleDataSourceService'
import { enrichVehicleVersionTech } from '@/services/vehicles/enrichVehicleVersionTech'

export type EnrichmentSuggestion = {
  versionId: string
  attribute: string
  currentValue: string | null
  proposedValue: string
  sourceId: string
  evidenceId?: string
}

/**
 * Aplica sugestão só em campo NULL (Fase 6).
 * Grava evidência confirmed após enrich bem-sucedido.
 */
export async function adminApplyEnrichmentSuggestion(
  suggestion: EnrichmentSuggestion,
): Promise<{ applied: boolean; conflicts: unknown[] }> {
  const patch: Record<string, string | null> = {
    fuel: null,
    transmission: null,
    traction: null,
    bodyConfiguration: null,
    vehicleClass: null,
  }
  if (!(suggestion.attribute in patch) && suggestion.attribute !== 'transmissionDetail' && suggestion.attribute !== 'tractionDetail') {
    throw new Error('unsupported_enrichment_attribute')
  }
  const attrs = {
    [suggestion.attribute]: suggestion.proposedValue,
  } as {
    fuel?: string | null
    transmission?: string | null
    transmissionDetail?: string | null
    traction?: string | null
    tractionDetail?: string | null
    bodyConfiguration?: string | null
    vehicleClass?: string | null
  }

  const result = await enrichVehicleVersionTech(suggestion.versionId, attrs)
  if (result.conflicts.length) {
    return { applied: false, conflicts: result.conflicts }
  }
  if (!result.enriched.includes(suggestion.attribute) && result.enriched.length === 0) {
    return { applied: false, conflicts: [] }
  }

  await adminInsertAttributeEvidence({
    sourceId: suggestion.sourceId,
    vehicleVersionId: suggestion.versionId,
    attributeName: suggestion.attribute,
    attributeValue: suggestion.proposedValue,
    validationStatus: 'confirmed',
  })

  return { applied: true, conflicts: [] }
}

/** Lista versões ativas com atributo NULL (amostra) para revisão humana. */
export async function adminListIncompleteVersions(limit = 50): Promise<
  Array<{
    id: string
    modelId: string
    year: number | null
    engine: string | null
    versionName: string | null
    fuel: string | null
    transmission: string | null
    traction: string | null
    bodyConfiguration: string | null
  }>
> {
  const { data, error } = await getSupabase()
    .from('vehicle_versions')
    .select(
      'id, model_id, year, engine, version_name, fuel, transmission, traction, body_configuration',
    )
    .eq('status', 'active')
    .or(
      'engine.is.null,version_name.is.null,fuel.is.null,transmission.is.null,traction.is.null,body_configuration.is.null',
    )
    .limit(limit)
  if (error) throw error
  return ((data ?? []) as Array<Record<string, unknown>>).map((r) => ({
    id: String(r.id),
    modelId: String(r.model_id),
    year: r.year == null ? null : Number(r.year),
    engine: r.engine == null ? null : String(r.engine),
    versionName: r.version_name == null ? null : String(r.version_name),
    fuel: r.fuel == null ? null : String(r.fuel),
    transmission: r.transmission == null ? null : String(r.transmission),
    traction: r.traction == null ? null : String(r.traction),
    bodyConfiguration: r.body_configuration == null ? null : String(r.body_configuration),
  }))
}
