import { describe, expect, it } from 'vitest'
import { postSaleWindowDaysLeft, postSaleWindowOpen } from './postSaleWindow'

describe('postSaleWindow', () => {
  it('abre dentro de 7 dias a partir de T0', () => {
    const t0 = new Date('2026-11-01T12:00:00.000Z')
    const day6 = new Date('2026-11-07T12:00:00.000Z')
    expect(postSaleWindowOpen(t0, day6)).toBe(true)
  })

  it('fecha apos 7 dias', () => {
    const t0 = new Date('2026-11-01T12:00:00.000Z')
    const day8 = new Date('2026-11-09T12:00:00.000Z')
    expect(postSaleWindowOpen(t0, day8)).toBe(false)
    expect(postSaleWindowDaysLeft(t0, day8)).toBe(0)
  })

  it('sem deliveredAt = fechada', () => {
    expect(postSaleWindowOpen(null)).toBe(false)
  })
})
