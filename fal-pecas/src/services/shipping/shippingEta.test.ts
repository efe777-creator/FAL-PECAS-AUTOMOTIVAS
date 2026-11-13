import { describe, expect, it } from 'vitest'
import { formatShippingEtaLabel } from '@/services/shipping/shippingEta'
import { createStorePickupOption } from '@/services/shipping/storePickupOption'
import type { ShippingQuoteOption } from '@/types'

function carrier(partial: Partial<ShippingQuoteOption> & Pick<ShippingQuoteOption, 'id'>): ShippingQuoteOption {
  return {
    provider: 'melhorenvio',
    serviceCode: '1',
    label: 'SEDEX',
    amount: 20,
    ...partial,
  }
}

describe('formatShippingEtaLabel', () => {
  it('retirada na loja', () => {
    expect(formatShippingEtaLabel(createStorePickupOption())).toBe('Retirada')
  })

  it('faixa de dias úteis', () => {
    expect(
      formatShippingEtaLabel(
        carrier({ id: 'meq:1', etaDaysMin: 3, etaDaysMax: 5 }),
      ),
    ).toBe('3–5 dias úteis')
  })

  it('dia único', () => {
    expect(
      formatShippingEtaLabel(carrier({ id: 'meq:2', etaDaysMin: 1, etaDaysMax: 1 })),
    ).toBe('1 dia útil')
    expect(
      formatShippingEtaLabel(carrier({ id: 'meq:3', etaDaysMin: 2, etaDaysMax: 2 })),
    ).toBe('2 dias úteis')
  })

  it('sem prazo', () => {
    expect(formatShippingEtaLabel(carrier({ id: 'meq:4' }))).toBe('')
  })
})
