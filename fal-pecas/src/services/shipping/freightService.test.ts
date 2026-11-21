import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  clearFreightCache,
  freightCacheKey,
  quoteFreight,
} from './freightService'
import type { ShippingQuoteOption, ShippingQuoteRequest } from '@/types'

const quoteMock = vi.fn()

vi.mock('@/services/shipping/carrierRegistry', () => ({
  getCarrierByEnvKey: () => ({
    id: 'melhorenvio',
    envKey: 'melhorenvio',
    label: 'Melhor Envio',
    mode: 'sandbox',
    enabled: true,
  }),
  resolveCarrierProvider: () => ({
    id: 'melhorenvio',
    quote: quoteMock,
  }),
}))

function req(partial?: Partial<ShippingQuoteRequest>): ShippingQuoteRequest {
  return {
    postalCode: '01310100',
    state: 'SP',
    city: 'São Paulo',
    subtotal: 100,
    itemCount: 1,
    items: [{ productId: 'p1', quantity: 1, weightKg: 1, heightCm: 10, widthCm: 10, lengthCm: 10 }],
    ...partial,
  }
}

const opt: ShippingQuoteOption = {
  id: 'me:1',
  provider: 'melhorenvio',
  label: 'Econômico',
  amount: 20,
  etaDaysMin: 3,
  etaDaysMax: 5,
  serviceCode: '1',
}

describe('freightService cache', () => {
  beforeEach(() => {
    clearFreightCache()
    quoteMock.mockReset()
    quoteMock.mockResolvedValue([opt])
  })

  it('freightCacheKey estabiliza items e CEP', () => {
    const a = freightCacheKey(req())
    const b = freightCacheKey(
      req({
        items: [
          { productId: 'p1', quantity: 1, weightKg: 1, heightCm: 10, widthCm: 10, lengthCm: 10 },
        ],
      }),
    )
    expect(a).toBe(b)
    expect(freightCacheKey(req({ postalCode: '01310-100' }))).toBe(a)
  })

  it('segunda cotação igual reusa cache (não chama provider)', async () => {
    await quoteFreight(req(), { envKey: 'melhorenvio' })
    await quoteFreight(req(), { envKey: 'melhorenvio' })
    expect(quoteMock).toHaveBeenCalledTimes(1)
  })

  it('bypassCache força nova chamada', async () => {
    await quoteFreight(req(), { envKey: 'melhorenvio' })
    await quoteFreight(req(), { envKey: 'melhorenvio', bypassCache: true })
    expect(quoteMock).toHaveBeenCalledTimes(2)
  })
})
