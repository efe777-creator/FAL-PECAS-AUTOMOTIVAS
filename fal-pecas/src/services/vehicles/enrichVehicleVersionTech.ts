import { getSupabase } from '@/lib/supabase'
import type { TechAttributeBag } from '@/services/vehicles/enrichVehicleAttributes'

export type EnrichVehicleVersionTechResult = {
  versionId: string
  enriched: string[]
  conflicts: Array<{ attribute: string; current: string; incoming: string }>
}

/** RPC enrich_vehicle_version_tech — só preenche NULL; conflitos sem sobrescrita. */
export async function enrichVehicleVersionTech(
  versionId: string,
  attrs: TechAttributeBag,
): Promise<EnrichVehicleVersionTechResult> {
  const { data, error } = await getSupabase().rpc('enrich_vehicle_version_tech', {
    p_version_id: versionId,
    p_fuel: attrs.fuel ?? null,
    p_transmission: attrs.transmission ?? null,
    p_transmission_detail: attrs.transmissionDetail ?? null,
    p_traction: attrs.traction ?? null,
    p_traction_detail: attrs.tractionDetail ?? null,
    p_body_configuration: attrs.bodyConfiguration ?? null,
    p_vehicle_class: attrs.vehicleClass ?? null,
  })
  if (error) throw error
  const row = (data ?? {}) as Record<string, unknown>
  const conflictsRaw = Array.isArray(row.conflicts) ? row.conflicts : []
  return {
    versionId: String(row.versionId ?? versionId),
    enriched: Array.isArray(row.enriched) ? row.enriched.map(String) : [],
    conflicts: conflictsRaw.map((c) => {
      const o = c as Record<string, unknown>
      return {
        attribute: String(o.attribute ?? ''),
        current: String(o.current ?? ''),
        incoming: String(o.incoming ?? ''),
      }
    }),
  }
}
