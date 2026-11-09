import { describe, expect, it } from 'vitest'
import { summarizeOrderMargin } from './orderMarginSummary'

describe('summarizeOrderMargin (033)', () => {
  it('calcula receita, CMV e margem com custos mistos', () => {
    const costs = new Map<string, { baseCost: number }>([
      ['p1', { baseCost: 50 }],
      ['p2', { baseCost: 20 }],
    ])
    const s = summarizeOrderMargin(
      [
        { id: 'a', productId: 'p1', unitPrice: 100, quantity: 2 },
        { id: 'b', productId: 'p2', unitPrice: 40, quantity: 1 },
        { id: 'c', productId: 'p3', unitPrice: 10, quantity: 1 },
      ],
      costs,
    )
    expect(s.revenueItems).toBe(250)
    expect(s.costItems).toBe(120)
    expect(s.profitItems).toBe(130)
    expect(s.itemsWithCost).toBe(2)
    expect(s.itemsMissingCost).toBe(1)
    expect(s.marginPercent).toBe(52)
    expect(s.lines.find((l) => l.itemId === 'a')?.marginPercent).toBe(50)
    expect(s.lines.find((l) => l.itemId === 'c')?.missingCost).toBe(true)
  })

  it('sem custos retorna nulls de CMV', () => {
    const s = summarizeOrderMargin(
      [{ id: 'a', productId: null, unitPrice: 10, quantity: 1 }],
      new Map(),
    )
    expect(s.costItems).toBeNull()
    expect(s.profitItems).toBeNull()
    expect(s.marginPercent).toBeNull()
  })
})
