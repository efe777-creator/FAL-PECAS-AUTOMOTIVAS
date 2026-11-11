/**
 * Camada IA (Onda 6) — contrato estável.
 * Hoje: fallback 100% determinístico via interpretSearchQuery.
 * Futuro: Edge Function NL → mesmo SearchIntent (sem inventar PVC).
 */
import {
  interpretSearchQuery,
  type SearchIntent,
  type VehicleCatalogEntry,
} from './interpretSearchQuery'

export type NlInterpretOptions = {
  catalog?: VehicleCatalogEntry[]
  /** Se true, tentaria LLM; ignorado até Edge existir. */
  allowLlm?: boolean
}

/**
 * Interpreta linguagem natural ou query curta.
 * Nunca confirma compatibilidade — só devolve intenção estruturada.
 */
export async function interpretNaturalLanguage(
  raw: string,
  opts: NlInterpretOptions = {},
): Promise<SearchIntent> {
  const catalog = opts.catalog ?? []
  // Gate: queries simples / códigos / YMM → só determinístico (sem custo IA).
  void opts.allowLlm
  return interpretSearchQuery(raw, catalog)
}
