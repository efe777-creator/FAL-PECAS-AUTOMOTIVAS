import type { ShippingProvider, ShippingQuoteOption, ShippingQuoteRequest } from '@/types'

/**
 * Stub futuro — transportadora própria/parceira.
 */
export const carrierStubProvider: ShippingProvider = {
  async quote(_req: ShippingQuoteRequest): Promise<ShippingQuoteOption[]> {
    throw new Error('CarrierShippingProvider não implementado (F9)')
  },
}
