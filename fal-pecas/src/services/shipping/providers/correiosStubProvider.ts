import type { ShippingProvider, ShippingQuoteOption, ShippingQuoteRequest } from '@/types'

/**
 * Stub futuro — Correios.
 * Não realizar chamadas reais nesta fase (F9).
 */
export const correiosStubProvider: ShippingProvider = {
  async quote(_req: ShippingQuoteRequest): Promise<ShippingQuoteOption[]> {
    throw new Error('CorreiosShippingProvider não implementado (F9)')
  },
}
