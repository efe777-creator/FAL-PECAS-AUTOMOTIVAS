import { describe, expect, it } from 'vitest'
import {
  kindToSignedPercent,
  signedPercentToKind,
} from './PaymentAdjustPercentControl'

describe('PaymentAdjustPercentControl helpers', () => {
  it('signed → kind', () => {
    expect(signedPercentToKind(0)).toEqual({ kind: 'none', magnitude: 0 })
    expect(signedPercentToKind(-5)).toEqual({ kind: 'discount', magnitude: 5 })
    expect(signedPercentToKind(3)).toEqual({ kind: 'increase', magnitude: 3 })
  })

  it('kind → signed', () => {
    expect(kindToSignedPercent('none', 10)).toBe(0)
    expect(kindToSignedPercent('discount', 5)).toBe(-5)
    expect(kindToSignedPercent('increase', 2)).toBe(2)
    expect(kindToSignedPercent('discount', 0)).toBe(0)
  })

  it('respeita tetos', () => {
    expect(kindToSignedPercent('discount', 95)).toBe(-90)
    expect(kindToSignedPercent('increase', 150)).toBe(100)
  })
})
