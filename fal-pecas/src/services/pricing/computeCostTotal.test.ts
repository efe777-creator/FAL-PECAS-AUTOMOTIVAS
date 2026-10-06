import { describe, expect, it } from 'vitest'
import { computeCostTotal } from '@/services/pricing/pricingFormulas'

describe('computeCostTotal com adicional %', () => {
  it('sem %: base + extra item (list R$ 0)', () => {
    expect(computeCostTotal(40, 2, 0, 0)).toBe(42)
  })

  it('com adicional de custo % da lista', () => {
    // 40 * 1.10 + 2 = 46
    expect(computeCostTotal(40, 2, 0, 10)).toBe(46)
  })

  it('list_extra_cost R$ ainda soma se passado (compat), mas callers usam 0', () => {
    expect(computeCostTotal(40, 0, 5, 0)).toBe(45)
  })
})
