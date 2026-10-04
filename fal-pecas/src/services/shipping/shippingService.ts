import { mockShippingProvider } from '@/services/shipping/mockShippingProvider'
import type { ShippingProvider, ShippingQuoteOption, ShippingQuoteRequest } from '@/types'

/**
 * Adapter ativo (F6 mock).
 * Cotação com cache: preferir `quoteFreight` (FreightService).
 * F9: setShippingProvider(correios|frenet|carrier) — stubs em providers/*.
 */
let activeProvider: ShippingProvider = mockShippingProvider

export function setShippingProvider(provider: ShippingProvider) {
  activeProvider = provider
}

export async function quoteShipping(req: ShippingQuoteRequest): Promise<ShippingQuoteOption[]> {
  const options = await activeProvider.quote(req)
  if (!options.length) throw new Error('Nenhuma opção de frete disponível para este CEP')
  return options
}
