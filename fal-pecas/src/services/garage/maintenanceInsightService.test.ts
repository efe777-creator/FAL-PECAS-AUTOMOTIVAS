import { describe, expect, it } from 'vitest'
import { buildMaintenanceInsights } from './maintenanceInsightService'
import type { MaintenanceSchedule } from './maintenanceScheduleService'

const baseSchedule = (over: Partial<MaintenanceSchedule>): MaintenanceSchedule => ({
  id: 's1',
  vehicleIdentityId: 'v1',
  title: 'Troca de óleo',
  description: null,
  scheduleKind: 'both',
  intervalDays: 180,
  intervalKm: 10000,
  lastDoneAt: '2025-01-01T00:00:00.000Z',
  lastDoneKm: 50000,
  nextDueAt: '2025-07-01T00:00:00.000Z',
  nextDueKm: 60000,
  source: 'customer',
  active: true,
  createdAt: '2025-01-01T00:00:00.000Z',
  ...over,
})

describe('buildMaintenanceInsights', () => {
  it('não inventa diagnóstico e etiqueta lacuna de km', () => {
    const insights = buildMaintenanceInsights({
      schedules: [],
      latestKm: null,
      maintenanceCount: 0,
      now: new Date('2026-01-01'),
    })
    expect(insights.some((i) => i.id === 'gap-km')).toBe(true)
    expect(insights.every((i) => !/diagnóstico mecânico efetivo/i.test(i.detail))).toBe(true)
  })

  it('marca vencido como estimativa de lembrete', () => {
    const insights = buildMaintenanceInsights({
      schedules: [baseSchedule({})],
      latestKm: 65000,
      maintenanceCount: 1,
      now: new Date('2026-01-01'),
    })
    const overdue = insights.find((i) => i.id === 'overdue-s1')
    expect(overdue).toBeTruthy()
    expect(overdue?.detail).toMatch(/não é diagnóstico/i)
  })
})
