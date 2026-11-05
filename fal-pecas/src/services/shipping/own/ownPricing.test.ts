import { describe, expect, it } from 'vitest'
import { computeOwnFreightAmount } from './ownPricing'

describe('computeOwnFreightAmount (piso + adicional)', () => {
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

  it('soma adicional após o piso', () => {
    expect(
      computeOwnFreightAmount({
        distanceKmOneWay: 3,
        valorPorKm: 4,
        tarifaMinima: 25,
        adicional: 5,
      }),
    ).toBe(30)
  })

  it('soma adicional após raw', () => {
    expect(
      computeOwnFreightAmount({
        distanceKmOneWay: 10,
        valorPorKm: 4,
        tarifaMinima: 25,
        adicional: 5,
      }),
    ).toBe(45)
  })
})
