import {
  getCarrierByEnvKey,
  resolveCarrierProvider,
} from '@/services/shipping/carrierRegistry'
import type { ShippingProvider, ShippingQuoteOption, ShippingQuoteRequest } from '@/types'

/**
 * Adapter ativo via carrierRegistry.
 * Cotação com cache: preferir `quoteFreight` (FreightService).
 * Envelope (PDP/carrinho/checkout): `quoteShippingEnvelope`.
 * Live Correios: Edge `quote-shipping` (não expor secrets no Vite).
 */
function resolveDefaultProvider(): ShippingProvider {
  const key = import.meta.env.VITE_SHIPPING_PROVIDER as string | undefined
  return resolveCarrierProvider(key)
}

let activeProvider: ShippingProvider = resolveDefaultProvider()

export function setShippingProvider(provider: ShippingProvider) {
  activeProvider = provider
}

export function getShippingProvider(): ShippingProvider {
  return activeProvider
}

/** Descriptor do provider resolvido pelo env atual. */
export function getActiveCarrierDescriptor() {
  return getCarrierByEnvKey(import.meta.env.VITE_SHIPPING_PROVIDER as string | undefined)
}

export async function quoteShipping(req: ShippingQuoteRequest): Promise<ShippingQuoteOption[]> {
  const options = await activeProvider.quote(req)
  if (!options.length) throw new Error('Nenhuma opção de frete disponível para este CEP')
  return options
}
