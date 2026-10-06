import { mockShippingProvider } from '@/services/shipping/mockShippingProvider'
import { carrierStubProvider } from '@/services/shipping/providers/carrierStubProvider'
import { correiosSandboxProvider } from '@/services/shipping/providers/correiosStubProvider'
import { frenetSandboxProvider } from '@/services/shipping/providers/frenetStubProvider'
import type { ShippingProvider, ShippingQuoteOption, ShippingQuoteRequest } from '@/types'

/**
 * Adapter ativo.
 * Cotação com cache: preferir `quoteFreight` (FreightService).
 * F9-A: VITE_SHIPPING_PROVIDER=correios → sandbox Correios
 * F9-B: VITE_SHIPPING_PROVIDER=frenet → sandbox agregador Frenet
 */
function resolveDefaultProvider(): ShippingProvider {
  const key = (import.meta.env.VITE_SHIPPING_PROVIDER as string | undefined)?.toLowerCase()
  if (key === 'correios') return correiosSandboxProvider
  if (key === 'frenet') return frenetSandboxProvider
  if (key === 'carrier') return carrierStubProvider
  return mockShippingProvider
}

let activeProvider: ShippingProvider = resolveDefaultProvider()

export function setShippingProvider(provider: ShippingProvider) {
  activeProvider = provider
}

export function getShippingProvider(): ShippingProvider {
  return activeProvider
}

export async function quoteShipping(req: ShippingQuoteRequest): Promise<ShippingQuoteOption[]> {
  const options = await activeProvider.quote(req)
  if (!options.length) throw new Error('Nenhuma opção de frete disponível para este CEP')
  return options
}
