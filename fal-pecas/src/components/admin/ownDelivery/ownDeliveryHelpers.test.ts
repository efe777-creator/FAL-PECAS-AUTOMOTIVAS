import { describe, expect, it } from 'vitest'
import { ensureOwnRateId, normalizeFlatRates, pricingModeLabel } from './ownDeliveryHelpers'

describe('ownDeliveryHelpers', () => {
  it('ensureOwnRateId preserva id own: válido', () => {
    expect(ensureOwnRateId('Qualquer', 'own:fal')).toBe('own:fal')
  })

  it('ensureOwnRateId gera slug a partir do label', () => {
    expect(ensureOwnRateId('Entrega FAL SP')).toBe('own:entrega_fal_sp')
  })

  it('pricingModeLabel', () => {
    expect(pricingModeLabel('flat')).toBe('preço fixo')
    expect(pricingModeLabel('distance_vehicle')).toBe('por distância e veículo')
  })

  it('normalizeFlatRates preenche id e prazos', () => {
    const out = normalizeFlatRates(
      [{ id: '', serviceCode: '', label: '  Expresso  ', amount: 10, etaDaysMin: 0, etaDaysMax: 0 }],
      2,
      5,
    )
    expect(out[0].id).toBe('own:expresso')
    expect(out[0].label).toBe('Expresso')
    expect(out[0].etaDaysMin).toBe(2)
    expect(out[0].etaDaysMax).toBe(5)
    expect(out[0].serviceCode).toBe('fal_sp')
  })
})
