/**
 * Camada IA (P2) — contrato estável.
 * Hoje: fallback 100% determinístico via interpretSearchQuery.
 * Pronto para Edge LLM grátis (Groq/Gemini): só quando allowLlm=true E flag remota.
 * Nunca inventa PVC / preço / estoque — LLM só devolve SearchIntent candidato.
 */
import {
  interpretSearchQuery,
  type SearchIntent,
  type VehicleCatalogEntry,
} from './interpretSearchQuery'

export type NlInterpretOptions = {
  catalog?: VehicleCatalogEntry[]
  /**
   * Reserva para Edge LLM. Ignorado até `VITE_SEARCH_NL_LLM=1` + função deployada.
   * Default false = busca refinada só com parser determinístico.
   */
  allowLlm?: boolean
}

function llmEnabledByEnv(): boolean {
  try {
    return String(import.meta.env.VITE_SEARCH_NL_LLM ?? '') === '1'
  } catch {
    return false
  }
}

/**
 * Interpreta linguagem natural ou query curta.
 * Sempre tem fallback determinístico — IA down ≠ busca quebrada.
 */
export async function interpretNaturalLanguage(
  raw: string,
  opts: NlInterpretOptions = {},
): Promise<SearchIntent> {
  const catalog = opts.catalog ?? []
  const wantLlm = Boolean(opts.allowLlm) && llmEnabledByEnv()

  if (wantLlm) {
    try {
      // Hook futuro: supabase.functions.invoke('interpret-search-nl', { body: { q: raw } })
      // Resposta deve ser SearchIntent parcial; merge + validar contra catalog.
      // Enquanto a Edge não existir, cai no determinístico.
    } catch {
      /* fallback abaixo */
    }
  }

  return interpretSearchQuery(raw, catalog)
}
