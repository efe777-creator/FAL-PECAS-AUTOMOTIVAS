import { describe, expect, it } from 'vitest'
import {
  productionLifeYearBounds,
  yearsFromProductionLife,
} from './productionLifeYears'

describe('productionLifeYears', () => {
  it('end null (em linha) usa ano corrente — não colapsa no start', () => {
    const b = productionLifeYearBounds(2021, null, 2026)
    expect(b.lo).toBe(2021)
    expect(b.hi).toBe(2026)
    const years = yearsFromProductionLife(2021, null, 2026)
    expect(years).toContain(2021)
    expect(years).toContain(2024)
    expect(years).toContain(2026)
    expect(years).toHaveLength(6)
  })

  it('Corolla 1993–null até 2026 cabe no cap 40', () => {
    const years = yearsFromProductionLife(1993, null, 2026)
    expect(years[0]).toBe(1993)
    expect(years[years.length - 1]).toBe(2026)
    expect(years.length).toBe(2026 - 1993 + 1)
  })

  it('end explícito respeita descontinuação', () => {
    expect(productionLifeYearBounds(2012, 2019, 2026)).toEqual({ lo: 2012, hi: 2019 })
  })

  it('span > 40 só extremos', () => {
    expect(yearsFromProductionLife(1970, null, 2026)).toEqual([1970, 2026])
  })
})
