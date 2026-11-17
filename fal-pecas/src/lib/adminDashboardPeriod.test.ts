import { describe, expect, it } from 'vitest'
import { resolveDashboardPeriod, toIsoDate } from '@/lib/adminDashboardPeriod'

describe('adminDashboardPeriod', () => {
  it('today = from === to', () => {
    const now = new Date(2026, 10, 17) // Nov 17
    const r = resolveDashboardPeriod('today', now)
    expect(r.from).toBe('2026-11-17')
    expect(r.to).toBe('2026-11-17')
  })

  it('last_7 cobre 7 dias inclusive', () => {
    const now = new Date(2026, 10, 17)
    const r = resolveDashboardPeriod('last_7', now)
    expect(r.from).toBe('2026-11-11')
    expect(r.to).toBe('2026-11-17')
  })

  it('this_month começa no dia 1', () => {
    const now = new Date(2026, 10, 17)
    const r = resolveDashboardPeriod('this_month', now)
    expect(r.from).toBe('2026-11-01')
    expect(r.to).toBe(toIsoDate(now))
  })
})
