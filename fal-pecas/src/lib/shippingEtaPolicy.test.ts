import { describe, expect, it } from 'vitest'
import {
  DEFAULT_SHIPPING_ETA_POLICY,
  computeMeDisplayEta,
  parseShippingEtaPolicy,
} from './shippingEtaPolicy'

describe('shippingEtaPolicy', () => {
  it('soma prep + buffer ao carrier quando prep não está inclusa', () => {
    const r = computeMeDisplayEta(
      { min: 3, max: 5 },
      {
        dayCountMode: 'business_days',
        me: { prepDays: 1, bufferDays: 1, prepIncludedInCarrier: false },
      },
    )
    expect(r.carrierEtaMin).toBe(3)
    expect(r.carrierEtaMax).toBe(5)
    expect(r.prepDaysApplied).toBe(1)
    expect(r.bufferDaysApplied).toBe(1)
    expect(r.displayEtaMin).toBe(5)
    expect(r.displayEtaMax).toBe(7)
  })

  it('não soma prep duas vezes se já inclusa no carrier', () => {
    const r = computeMeDisplayEta(
      { min: 4, max: 6 },
      {
        dayCountMode: 'business_days',
        me: { prepDays: 2, bufferDays: 1, prepIncludedInCarrier: true },
      },
    )
    expect(r.prepDaysApplied).toBe(0)
    expect(r.displayEtaMin).toBe(5)
    expect(r.displayEtaMax).toBe(7)
  })

  it('parse preenche defaults sem hardcode quebrado', () => {
    const p = parseShippingEtaPolicy({})
    expect(p.mock.economicMin).toBe(DEFAULT_SHIPPING_ETA_POLICY.mock.economicMin)
    expect(p.dayCountMode).toBe('business_days')
  })
})
