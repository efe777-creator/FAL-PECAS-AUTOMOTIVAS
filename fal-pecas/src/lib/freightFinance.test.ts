import { describe, expect, it } from 'vitest'
import {
  buildFreightFinanceSnapshot,
  isG8FreightFinanceComplete,
  parseFreightFinance,
} from './freightFinance'

describe('freightFinance (Marcha 8 / G8)', () => {
  it('ME: charged vs label_amount → delta e completo', () => {
    const snap = buildFreightFinanceSnapshot({
      chargedShipping: 29.9,
      effectiveCost: 32.5,
      costSource: 'me_label',
    })
    expect(snap.delta).toBeCloseTo(-2.6, 2)
    expect(isG8FreightFinanceComplete(snap)).toBe(true)
  })

  it('Own: custo efetivo registrado → G8 ok', () => {
    const snap = buildFreightFinanceSnapshot({
      chargedShipping: 18,
      effectiveCost: 12,
      costSource: 'own_ops',
    })
    expect(snap.delta).toBe(6)
    expect(isG8FreightFinanceComplete(snap)).toBe(true)
  })

  it('sem custo efetivo → G8 incompleto', () => {
    expect(
      isG8FreightFinanceComplete(
        buildFreightFinanceSnapshot({
          chargedShipping: 20,
          effectiveCost: null,
          costSource: 'pending',
        }),
      ),
    ).toBe(false)
  })

  it('parse lê metadata.finance', () => {
    const f = parseFreightFinance({
      finance: {
        charged_shipping: 10,
        effective_cost: 8,
        cost_source: 'own_ops',
        delta: 2,
      },
    })
    expect(f?.chargedShipping).toBe(10)
    expect(f?.effectiveCost).toBe(8)
    expect(isG8FreightFinanceComplete(f)).toBe(true)
  })

  it('ME label_amount em me.* ainda não é G8 até finance snapshot', () => {
    expect(
      isG8FreightFinanceComplete(
        parseFreightFinance({ me: { label_amount: 15 }, packing: {} }),
      ),
    ).toBe(false)
  })
})
