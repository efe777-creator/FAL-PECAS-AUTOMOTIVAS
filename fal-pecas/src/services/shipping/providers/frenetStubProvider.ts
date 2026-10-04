import type { ShippingProvider, ShippingQuoteOption, ShippingQuoteRequest } from '@/types'

/**
 * Stub futuro — Frenet/agregador.
 * Credenciais apenas via backend/Edge Function (nunca no frontend).
 */
export const frenetStubProvider: ShippingProvider = {
  async quote(_req: ShippingQuoteRequest): Promise<ShippingQuoteOption[]> {
    throw new Error('FrenetShippingProvider não implementado (F9)')
  },
}
