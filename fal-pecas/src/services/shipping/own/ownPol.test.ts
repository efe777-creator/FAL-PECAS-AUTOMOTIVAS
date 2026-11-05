import { describe, expect, it } from 'vitest'
import { computePolTotal, type OwnProductLogisticProfile } from './ownPol'

function profile(
  partial: Partial<OwnProductLogisticProfile> & { productId: string },
): OwnProductLogisticProfile {
  return {
    polUnit: 1,
    ownDeliveryAllowed: true,
    vehicleMinCode: null,
    compatibleVehicleCodes: ['motorcycle', 'car'],
    ...partial,
  }
}

describe('computePolTotal', () => {
  it('soma qty × POL', () => {
    const map = {
      a: profile({ productId: 'a', polUnit: 1 }),
      b: profile({ productId: 'b', polUnit: 3 }),
    }
    const r = computePolTotal(
      [
        { productId: 'a', quantity: 4 },
        { productId: 'b', quantity: 2 },
      ],
      map,
    )
    expect(r).toEqual({ ok: true, polTotal: 10 })
  })

  it('bloqueia own_delivery_allowed=false', () => {
    const map = { a: profile({ productId: 'a', ownDeliveryAllowed: false }) }
    const r = computePolTotal([{ productId: 'a', quantity: 1 }], map)
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.status).toBe('ineligible')
  })

  it('marca incomplete sem POL', () => {
    const map = { a: profile({ productId: 'a', polUnit: null }) }
    const r = computePolTotal([{ productId: 'a', quantity: 1 }], map)
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.status).toBe('incomplete')
  })
})
