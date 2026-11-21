/**
 * Assistência IA na identificação por placa (Notes #6).
 * Mesmo padrão da busca NL: Edge Groq opcional + merge só contra cadastro.
 * Nunca substitui ApiPlacas nem pula conferência humana.
 */
import { normalizeEntityMatchKey } from '@/lib/entityNormalize'
import { isSupabaseConfigured, supabase } from '@/lib/supabase'
import type { PlateLookupResult } from '@/services/plates/plateTypes'
import type { VehicleCatalogEntry } from '@/services/search/interpretSearchQuery'

function plateLlmEnabledByEnv(): boolean {
  try {
    const plate = String(import.meta.env.VITE_PLATE_NL_LLM ?? '').trim()
    if (plate === '1') return true
    if (plate === '0') return false
    // Reusa a flag da busca NL se a específica não estiver setada.
    return String(import.meta.env.VITE_SEARCH_NL_LLM ?? '') === '1'
  } catch {
    return false
  }
}

function buildPlateAssistQuery(result: PlateLookupResult): string {
  return [
    'Veículo pela placa',
    result.plate,
    result.maker,
    result.model,
    result.year,
    result.engine,
    result.version,
    result.fuel,
    result.transmission,
  ]
    .filter((x) => x != null && String(x).trim())
    .join(' ')
    .slice(0, 240)
}

type LlmVehiclePartial = {
  maker?: string | null
  model?: string | null
  year?: string | null
  engine?: string | null
  version?: string | null
  confidence?: string | null
}

/**
 * Merge assistido: só aplica maker/model/year se existirem no catálogo FAL.
 * Motor/versão só se listados no entry (quando houver).
 */
export function mergePlateAssistAgainstCatalog(
  base: PlateLookupResult,
  partial: LlmVehiclePartial | null | undefined,
  catalog: VehicleCatalogEntry[],
): PlateLookupResult {
  if (!partial || !catalog.length) return base

  let maker = base.maker
  let model = base.model
  let year = base.year
  let engine = base.engine
  let version = base.version
  let changed = false

  const modelKey = partial.model ? normalizeEntityMatchKey(partial.model) : ''
  const entry = modelKey
    ? catalog.find((c) => normalizeEntityMatchKey(c.model) === modelKey)
    : undefined

  if (entry) {
    if (entry.model !== base.model || entry.maker !== base.maker) {
      model = entry.model
      maker = entry.maker
      changed = true
    }
  } else if (partial.maker?.trim() && partial.model?.trim()) {
    const makerKey = normalizeEntityMatchKey(partial.maker)
    const makerHit = catalog.find(
      (c) =>
        normalizeEntityMatchKey(c.maker) === makerKey &&
        normalizeEntityMatchKey(c.model) === modelKey,
    )
    if (makerHit) {
      maker = makerHit.maker
      model = makerHit.model
      changed = true
    }
  }

  if (partial.year?.trim() && /^\d{4}$/.test(partial.year.trim())) {
    year = partial.year.trim()
    changed = true
  }

  if (entry?.versions?.length && partial.version?.trim()) {
    const vKey = normalizeEntityMatchKey(partial.version)
    const canon = entry.versions.find((v) => normalizeEntityMatchKey(v) === vKey)
    if (canon) {
      version = canon
      changed = true
    }
  }

  if (entry && partial.engine?.trim()) {
    // Sem lista de motores no catalog entry — só aceita se base já tinha vazio
    // e o texto é curto (evita DENATRAN). Validação fina fica no reconcile.
    const eng = partial.engine.trim()
    if (!base.engine && eng.length <= 24) {
      engine = eng
      changed = true
    }
  }

  if (!changed) return base

  return {
    ...base,
    maker,
    model,
    year,
    engine,
    version,
    identityLlmAssisted: true,
    message:
      base.message ??
      'Ajuste sugerido pela assistência de identificação — confira antes de buscar.',
  }
}

/**
 * Chama Edge `interpret-search-nl` só quando a identificação precisa de ajuda
 * (band C/D, incomplete, ambiguous sem candidatos). Fallback = resultado original.
 */
export async function assistPlateIdentity(
  result: PlateLookupResult,
  catalog: VehicleCatalogEntry[],
): Promise<PlateLookupResult> {
  if (!plateLlmEnabledByEnv() || !isSupabaseConfigured || !supabase) return result
  if (!catalog.length) return result

  const band = result.confidenceBand
  const needsHelp =
    band === 'C' ||
    band === 'D' ||
    result.status === 'incomplete' ||
    result.status === 'ambiguous' ||
    result.status === 'not_in_catalog'
  if (!needsHelp) return result

  try {
    const { data, error } = await supabase.functions.invoke('interpret-search-nl', {
      body: { q: buildPlateAssistQuery(result) },
    })
    if (error || !data?.intent) return result
    const intent = data.intent as { vehicle?: LlmVehiclePartial }
    return mergePlateAssistAgainstCatalog(result, intent.vehicle ?? null, catalog)
  } catch {
    return result
  }
}
