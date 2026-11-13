import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/services/shipping/edgeQuoteClient', () => ({
  invokeQuoteShippingEdge: vi.fn(),
}))
vi.mock('@/services/shipping/own/ownQuoteOptions', () => ({
  resolveOwnQuoteOptions: vi.fn(),
}))

import { invokeQuoteShippingEdge } from '@/services/shipping/edgeQuoteClient'
import { resolveOwnQuoteOptions } from '@/services/shipping/own/ownQuoteOptions'
import { melhorEnvioEdgeProvider } from './melhorEnvioEdgeProvider'
import type { ShippingQuoteRequest } from '@/types'

const baseReq: ShippingQuoteRequest = {
  postalCode: '01310100',
  state: 'SP',
  city: 'São Paulo',
  subtotal: 100,
  itemCount: 1,
  items: [
    {
      productId: 'p1',
      quantity: 1,
      weightKg: 1,
      heightCm: 10,
      widthCm: 10,
      lengthCm: 10,
    },
  ],
  totalWeightKg: 1,
}

describe('melhorEnvioEdgeProvider own decouple', () => {
  beforeEach(() => {
    vi.mocked(resolveOwnQuoteOptions).mockReset()
    vi.mocked(invokeQuoteShippingEdge).mockReset()
  })

  it('retorna own + pickup quando ME falha', async () => {
    vi.mocked(resolveOwnQuoteOptions).mockResolvedValue([
      {
        id: 'ownq:fal',
        provider: 'own',
        serviceCode: 'fal',
        label: 'Entrega FAL',
        amount: 29.9,
      },
    ])
    vi.mocked(invokeQuoteShippingEdge).mockRejectedValue(new Error('ME offline'))

    const opts = await melhorEnvioEdgeProvider.quote(baseReq)
    expect(opts.some((o) => o.provider === 'own')).toBe(true)
    expect(opts.some((o) => o.id === 'mock:pickup')).toBe(true)
  })

  it('retorna own quando faltam dims (não chama ME)', async () => {
    vi.mocked(resolveOwnQuoteOptions).mockResolvedValue([
      {
        id: 'ownq:fal',
        provider: 'own',
        serviceCode: 'fal',
        label: 'Entrega FAL',
        amount: 19.9,
      },
    ])
    const req: ShippingQuoteRequest = {
      ...baseReq,
      items: [{ productId: 'p1', quantity: 1 }],
      totalWeightKg: undefined,
    }
    const opts = await melhorEnvioEdgeProvider.quote(req)
    expect(invokeQuoteShippingEdge).not.toHaveBeenCalled()
    expect(opts.some((o) => o.id === 'ownq:fal')).toBe(true)
  })
})
