import {
  matchPreferredShippingOption,
  type ShippingQuoteHandoff,
} from '@/services/shipping/shippingQuoteSession'
import type { ShippingQuoteOption } from '@/types'

/**
 * Pré-seleção na vitrine após cotar:
 * handoff (id → pickup → serviceCode → label) → senão 1ª opção
 * (lista já ordenada: preço ↑, retirada por último).
 */
export function preferStorefrontShippingOption(
  options: ShippingQuoteOption[],
  handoff: ShippingQuoteHandoff | null | undefined,
): ShippingQuoteOption | null {
  if (!options.length) return null
  return matchPreferredShippingOption(options, handoff) ?? options[0] ?? null
}
