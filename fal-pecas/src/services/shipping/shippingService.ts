import { mockShippingProvider } from '@/services/shipping/mockShippingProvider'
import type { ShippingProvider, ShippingQuoteOption, ShippingQuoteRequest } from '@/types'

/** Adapter ativo na F6. Na F9, trocar por provider real mantendo o contrato. */
let activeProvider: ShippingProvider = mockShippingProvider

export function setShippingProvider(provider: ShippingProvider) {
  activeProvider = provider
}

export async function quoteShipping(req: ShippingQuoteRequest): Promise<ShippingQuoteOption[]> {
  const options = await activeProvider.quote(req)
  if (!options.length) throw new Error('Nenhuma opção de frete disponível para este CEP')
  return options
}
