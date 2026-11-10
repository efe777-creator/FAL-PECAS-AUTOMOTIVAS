import { describe, expect, it } from 'vitest'
import { isBannerWithinSchedule } from './homeContentService'

describe('isBannerWithinSchedule', () => {
  const now = new Date('2026-11-10T15:00:00.000Z')

  it('aceita banner sem vigência', () => {
    expect(isBannerWithinSchedule(null, null, now)).toBe(true)
  })

  it('rejeita antes do início', () => {
    expect(isBannerWithinSchedule('2026-11-11T00:00:00.000Z', null, now)).toBe(false)
  })

  it('rejeita depois do fim', () => {
    expect(isBannerWithinSchedule(null, '2026-11-09T23:59:59.000Z', now)).toBe(false)
  })

  it('aceita dentro do intervalo', () => {
    expect(
      isBannerWithinSchedule('2026-11-01T00:00:00.000Z', '2026-11-30T23:59:59.000Z', now),
    ).toBe(true)
  })
})
