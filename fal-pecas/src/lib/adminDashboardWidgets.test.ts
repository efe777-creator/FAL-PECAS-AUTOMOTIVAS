import { describe, expect, it } from 'vitest'
import {
  allowedWidgetIdSet,
  listAvailableWidgets,
  widgetAllowedForRole,
  getWidgetMeta,
  DEFAULT_LAYOUT_PLACEMENTS,
} from '@/lib/adminDashboardWidgets'

describe('adminDashboardWidgets sizes / reset', () => {
  it('defaults e mins compactos', () => {
    expect(getWidgetMeta('exec-summary')).toMatchObject({
      defaultSize: { w: 12, h: 3 },
      minSize: { w: 4, h: 2 },
    })
    expect(getWidgetMeta('pipeline-flow')).toMatchObject({
      defaultSize: { w: 12, h: 6 },
      minSize: { w: 4, h: 3 },
    })
    expect(getWidgetMeta('attention-table')).toMatchObject({
      defaultSize: { w: 8, h: 4 },
      minSize: { w: 3, h: 2 },
    })
    expect(getWidgetMeta('logistics-queues')).toMatchObject({
      defaultSize: { w: 4, h: 4 },
      minSize: { w: 2, h: 2 },
    })
    expect(getWidgetMeta('chart-performance')).toMatchObject({
      defaultSize: { w: 12, h: 4 },
      minSize: { w: 4, h: 2 },
    })
    expect(getWidgetMeta('quick-controls')).toMatchObject({
      defaultSize: { w: 12, h: 2 },
      minSize: { w: 4, h: 2 },
    })
    expect(getWidgetMeta('shortcuts-pinned')).toMatchObject({
      defaultSize: { w: 12, h: 2 },
      minSize: { w: 4, h: 2 },
    })
    expect(getWidgetMeta('cash-box')).toMatchObject({
      defaultSize: { w: 4, h: 3 },
      minSize: { w: 3, h: 2 },
    })
  })

  it('DEFAULT_LAYOUT_PLACEMENTS alinhado ao reset compacto', () => {
    expect(DEFAULT_LAYOUT_PLACEMENTS).toEqual({
      'exec-summary': { x: 0, y: 0, w: 12, h: 3 },
      'pipeline-flow': { x: 0, y: 3, w: 12, h: 6 },
      'attention-table': { x: 0, y: 9, w: 8, h: 4 },
      'logistics-queues': { x: 8, y: 9, w: 4, h: 4 },
      'chart-performance': { x: 0, y: 13, w: 12, h: 4 },
    })
  })
})

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
