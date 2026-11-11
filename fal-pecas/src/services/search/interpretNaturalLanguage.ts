/**
 * Camada IA (P2) — contrato estável.
 * Fallback permanente: interpretSearchQuery.
 * LLM: Edge `interpret-search-nl` só com VITE_SEARCH_NL_LLM=1.
 * Nunca inventa PVC / preço / estoque.
 */
import { normalizeEntityMatchKey } from '@/lib/entityNormalize'
import { isSupabaseConfigured, supabase } from '@/lib/supabase'
import {
  interpretSearchQuery,
  type SearchIntent,
  type SearchIntentVehicle,
  type VehicleCatalogEntry,
} from './interpretSearchQuery'

export type NlInterpretOptions = {
  catalog?: VehicleCatalogEntry[]
  /** Default true quando env liga LLM; false força só determinístico. */
  allowLlm?: boolean
}

function llmEnabledByEnv(): boolean {
  try {
    return String(import.meta.env.VITE_SEARCH_NL_LLM ?? '') === '1'
  } catch {
    return false
  }
}

/** Exportado para Vitest — merge LLM + cadastro (versão só se existir). */
export function mergeSearchIntent(
  base: SearchIntent,
  partial: Partial<SearchIntent> | null | undefined,
  catalog: VehicleCatalogEntry[],
): SearchIntent {
  if (!partial || typeof partial !== 'object') return base
  const vehicle: SearchIntentVehicle = {
    ...base.vehicle,
    ...(partial.vehicle ?? {}),
  }
  let needsClarification = partial.needsClarification ?? base.needsClarification
  let clarification = partial.clarification ?? base.clarification

  // Revalida model contra catálogo se LLM inventou grafia
  let modelEntry: VehicleCatalogEntry | undefined
  if (vehicle.model && catalog.length) {
    const key = normalizeEntityMatchKey(vehicle.model)
    modelEntry = catalog.find((c) => normalizeEntityMatchKey(c.model) === key)
    if (modelEntry) {
      vehicle.model = modelEntry.model
      vehicle.maker = vehicle.maker || modelEntry.maker
    }
  }

  // Versão do LLM só se cadastrada no modelo (T05 One vs Unique)
  if (vehicle.version?.trim() && modelEntry?.versions?.length) {
    const vKey = normalizeEntityMatchKey(vehicle.version)
    const canon = modelEntry.versions.find((v) => normalizeEntityMatchKey(v) === vKey)
    if (canon) {
      vehicle.version = canon
    } else {
      delete vehicle.version
      needsClarification = true
      clarification = 'version'
    }
  } else if (vehicle.version?.trim() && modelEntry && !(modelEntry.versions?.length)) {
    // Modelo sem lista de versões: mantém só se determinístico já tinha
    if (!base.vehicle.version) delete vehicle.version
  }

  return {
    ...base,
    productQuery:
      partial.productQuery !== undefined ? partial.productQuery : base.productQuery,
    vehicle,
    codeHint: partial.codeHint ?? base.codeHint,
    needsClarification,
    clarification,
    confidence: partial.confidence ?? base.confidence,
  }
}

/**
 * Interpreta linguagem natural ou query curta.
 * IA down / flag off → determinístico (busca não quebra).
 */
export async function interpretNaturalLanguage(
  raw: string,
  opts: NlInterpretOptions = {},
): Promise<SearchIntent> {
  const catalog = opts.catalog ?? []
  const deterministic = interpretSearchQuery(raw, catalog)
  const wantLlm = opts.allowLlm !== false && llmEnabledByEnv()

  if (!wantLlm || !isSupabaseConfigured || !supabase) {
    return deterministic
  }

  // Código / YMM já altos: não gasta LLM
  if (deterministic.confidence === 'high' || deterministic.codeHint) {
    return deterministic
  }

  try {
    const { data, error } = await supabase.functions.invoke('interpret-search-nl', {
      body: { q: raw },
    })
    if (error || !data || data.intent == null) return deterministic
    return mergeSearchIntent(deterministic, data.intent as Partial<SearchIntent>, catalog)
  } catch {
    return deterministic
  }
}
