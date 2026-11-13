import { describe, expect, it } from 'vitest'
import {
  ensureCheckoutQuoteFromMeta,
  parseOpsQuotes,
} from './opsShippingQuote'

describe('opsShippingQuote', () => {
  it('congela checkout_quote a partir do metadata raiz', () => {
    const q = ensureCheckoutQuoteFromMeta(
      {
        label: 'Jadlog — .Package',
        service_id: 3,
        charged_shipping: 22.5,
        volumes: { lengthCm: 16, widthCm: 11, heightCm: 2, weightKg: 0.3 },
      },
      22.5,
    )
    expect(q.serviceId).toBe(3)
    expect(q.amount).toBe(22.5)
    expect(q.volumes[0]?.widthCm).toBe(11)
    expect(q.volumeCount).toBe(1)
  })

  it('não sobrescreve checkout_quote existente', () => {
    const q = ensureCheckoutQuoteFromMeta({
      checkout_quote: {
        label: 'Original',
        amount: 10,
        service_id: 1,
        volumes: [{ lengthCm: 1, widthCm: 1, heightCm: 1, weightKg: 1 }],
        frozen_at: '2026-01-01T00:00:00Z',
      },
      label: 'Outro',
    })
    expect(q.label).toBe('Original')
    expect(q.amount).toBe(10)
  })

  it('parseOpsQuotes lê histórico append', () => {
    const list = parseOpsQuotes({
      ops_quotes: [
        {
          at: '2026-11-13T10:00:00Z',
          quoted_amount: 30,
          selected_service_id: 2,
          options: [{ id: 2, company: 'Correios', name: 'PAC', price: 30 }],
          volumes: [{ lengthCm: 20, widthCm: 15, heightCm: 10, weightKg: 1 }],
        },
      ],
    })
    expect(list).toHaveLength(1)
    expect(list[0]?.options[0]?.company).toBe('Correios')
  })
})
