import { describe, expect, it } from 'vitest'
import {
  computeMeDisplayEta,
  computeOwnDisplayEta,
  parseShippingEtaPolicy,
} from './shippingEtaPolicy'

describe('shippingEtaPolicy — prazo real + tempo extra', () => {
  it('ME: exibido = carrier real + tempo extra (sem doble prep)', () => {
    const r = computeMeDisplayEta(
      { min: 2, max: 4 },
      {
        dayCountMode: 'business_days',
        me: { extraDays: 1, prepDays: 0, bufferDays: 1, prepIncludedInCarrier: true },
      },
    )
    expect(r.carrierEtaMin).toBe(2)
    expect(r.carrierEtaMax).toBe(4)
    expect(r.extraDaysApplied).toBe(1)
    expect(r.displayEtaMin).toBe(3)
    expect(r.displayEtaMax).toBe(5)
  })

  it('Own: exibido = prazo base + tempo extra', () => {
    const r = computeOwnDisplayEta(
      { min: 1, max: 2 },
      { own: { dayCountMode: 'business_days', extraDays: 2 } },
    )
    expect(r.baseEtaMin).toBe(1)
    expect(r.baseEtaMax).toBe(2)
    expect(r.displayEtaMin).toBe(3)
    expect(r.displayEtaMax).toBe(4)
  })

  it('migra buffer antigo para extraDays', () => {
    const p = parseShippingEtaPolicy({
      me: { buffer_days: 2, prep_days: 1, prep_included_in_carrier: false },
    })
    expect(p.me.extraDays).toBe(3)
    expect(p.me.prepIncludedInCarrier).toBe(true)
  })
})
