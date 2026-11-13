import { describe, expect, it, vi, beforeEach } from 'vitest'
import { selectableShippingOptions } from '@/services/shipping/quoteStorefrontShipping'
import { ensureCheckoutQuoteFromMeta, parseOpsQuotes } from '@/lib/opsShippingQuote'
import { ownTransportLabel } from '@/lib/ownTransportOptions'
import { buildTrackingUrl } from '@/lib/shipmentTrackingUrl'

vi.mock('@/services/shipping/edgeQuoteClient', () => ({
  invokeQuoteShippingEdge: vi.fn(),
}))
vi.mock('@/services/shipping/own/ownQuoteOptions', () => ({
  resolveOwnQuoteOptions: vi.fn(),
}))

import { invokeQuoteShippingEdge } from '@/services/shipping/edgeQuoteClient'
import { resolveOwnQuoteOptions } from '@/services/shipping/own/ownQuoteOptions'
import { melhorEnvioEdgeProvider } from '@/services/shipping/providers/melhorEnvioEdgeProvider'

/** Smoke lógico C6/C5/C7 — sem rede. */
describe('Smoke Fase C lógico', () => {
  beforeEach(() => {
    vi.mocked(resolveOwnQuoteOptions).mockReset()
    vi.mocked(invokeQuoteShippingEdge).mockReset()
  })

  it('C6-1: own+pickup sobrevivem a falha ME', async () => {
    vi.mocked(resolveOwnQuoteOptions).mockResolvedValue([
      {
        id: 'ownq:fal',
        provider: 'own',
        serviceCode: 'fal',
        label: 'Entrega FAL',
        amount: 29.9,
      },
    ])
    vi.mocked(invokeQuoteShippingEdge).mockRejectedValue(new Error('ME down'))
    const opts = await melhorEnvioEdgeProvider.quote({
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
    })
    const selectable = selectableShippingOptions(opts)
    expect(selectable.some((o) => o.provider === 'own')).toBe(true)
    expect(opts.some((o) => o.id === 'mock:pickup')).toBe(true)
  })

  it('C6-2: label de prestador cadastrado', () => {
    expect(ownTransportLabel('moto_x', [{ id: 'moto_x', label: 'Moto X' }])).toBe('Moto X')
  })

  it('C5: checkout_quote imutável + ops_quotes parse', () => {
    const q = ensureCheckoutQuoteFromMeta({
      checkout_quote: {
        label: 'Original',
        amount: 22.5,
        service_id: 1,
        volumes: [{ lengthCm: 16, widthCm: 11, heightCm: 2, weightKg: 0.3 }],
        frozen_at: '2026-11-13T00:00:00Z',
      },
      label: 'Ops mudou',
      charged_shipping: 99,
    })
    expect(q.label).toBe('Original')
    expect(q.amount).toBe(22.5)
    const ops = parseOpsQuotes({
      ops_quotes: [
        {
          at: '2026-11-13T12:00:00Z',
          quoted_amount: 35,
          selected_service_id: 3,
          options: [{ id: 3, company: 'Jadlog', name: 'Package', price: 35 }],
        },
      ],
    })
    expect(ops[0]?.quotedAmount).toBe(35)
    expect(ops[0]?.options[0]?.company).toBe('Jadlog')
  })

  it('C7: buildTrackingUrl prioriza URL explícita', () => {
    expect(
      buildTrackingUrl({
        trackingCode: 'AB123456789BR',
        trackingUrl: 'https://rastreio.exemplo/xyz',
      }),
    ).toBe('https://rastreio.exemplo/xyz')
  })
})
