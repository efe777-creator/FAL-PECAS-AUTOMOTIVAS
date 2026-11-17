import { describe, expect, it } from 'vitest'
import {
  allowedWidgetIdSet,
  listAvailableWidgets,
  widgetAllowedForRole,
  getWidgetMeta,
} from '@/lib/adminDashboardWidgets'

describe('adminDashboardWidgets auth', () => {
  it('admin vê caixa, GMV, charts e layout interpretação', () => {
    const ids = allowedWidgetIdSet('administrador')
    expect(ids.has('cash-box')).toBe(true)
    expect(ids.has('gmv-delivered')).toBe(true)
    expect(ids.has('chart-gmv-series')).toBe(true)
    expect(ids.has('chart-cash-series')).toBe(true)
    expect(ids.has('chart-performance')).toBe(true)
    expect(ids.has('exec-summary')).toBe(true)
    expect(ids.has('attention-table')).toBe(true)
  })

  it('operador não vê F8/caixa/charts', () => {
    const ids = allowedWidgetIdSet('operador')
    expect(ids.has('gmv-delivered')).toBe(false)
    expect(ids.has('cash-box')).toBe(false)
    expect(ids.has('chart-gmv-series')).toBe(false)
    expect(ids.has('chart-cash-series')).toBe(false)
    expect(ids.has('chart-performance')).toBe(false)
    expect(ids.has('kpi-reports-open')).toBe(false)
    expect(ids.has('pipeline-flow')).toBe(true)
    expect(ids.has('exec-summary')).toBe(true)
  })

  it('atendimento não vê estoque-only mas vê pedidos', () => {
    const ids = allowedWidgetIdSet('atendimento')
    expect(ids.has('attention-table')).toBe(true)
    expect(ids.has('cash-box')).toBe(false)
  })

  it('customer não vê nada', () => {
    expect(listAvailableWidgets('customer')).toHaveLength(0)
  })

  it('role change remove cash do allow set', () => {
    const cash = getWidgetMeta('cash-box')!
    expect(widgetAllowedForRole(cash, 'gerente')).toBe(true)
    expect(widgetAllowedForRole(cash, 'operador')).toBe(false)
  })
})
