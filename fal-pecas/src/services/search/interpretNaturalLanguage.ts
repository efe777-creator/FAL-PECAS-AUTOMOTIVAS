/**
 * Camada IA (P2) — contrato estável.
 * Fallback permanente: interpretSearchQuery.
 * LLM: Edge `interpret-search-nl` só com VITE_SEARCH_NL_LLM=1.
 * Nunca inventa PVC / preço / estoque.
 */
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

function mergeIntent(
  base: SearchIntent,
  partial: Partial<SearchIntent> | null | undefined,
  catalog: VehicleCatalogEntry[],
): SearchIntent {
  if (!partial || typeof partial !== 'object') return base
  const vehicle: SearchIntentVehicle = {
    ...base.vehicle,
    ...(partial.vehicle ?? {}),
  }
  // Revalida model contra catálogo se LLM inventou grafia
  if (vehicle.model && catalog.length) {
    const key = vehicle.model.trim().toLowerCase()
    const hit = catalog.find((c) => c.model.toLowerCase() === key)
    if (hit) {
      vehicle.model = hit.model
      vehicle.maker = vehicle.maker || hit.maker
    }
  }
  return {
    ...base,
    productQuery:
      partial.productQuery !== undefined ? partial.productQuery : base.productQuery,
    vehicle,
    codeHint: partial.codeHint ?? base.codeHint,
    needsClarification: partial.needsClarification ?? base.needsClarification,
    clarification: partial.clarification ?? base.clarification,
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
    return mergeIntent(deterministic, data.intent as Partial<SearchIntent>, catalog)
  } catch {
    return deterministic
  }
}
