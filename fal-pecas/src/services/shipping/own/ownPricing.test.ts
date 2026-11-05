import { describe, expect, it } from 'vitest'
import { computeOwnFreightAmount } from './ownPricing'

describe('computeOwnFreightAmount (piso APROVADO)', () => {
  it('aplica piso quando raw < mínima', () => {
    expect(
      computeOwnFreightAmount({ distanceKmOneWay: 3, valorPorKm: 4, tarifaMinima: 25 }),
    ).toBe(25)
  })

  it('usa raw quando raw >= mínima', () => {
    expect(
      computeOwnFreightAmount({ distanceKmOneWay: 10, valorPorKm: 4, tarifaMinima: 25 }),
    ).toBe(40)
  })

  it('não multiplica ida (só km informado)', () => {
    expect(
      computeOwnFreightAmount({ distanceKmOneWay: 5, valorPorKm: 2, tarifaMinima: 0 }),
    ).toBe(10)
  })
})
