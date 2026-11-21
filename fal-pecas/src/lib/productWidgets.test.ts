import { describe, expect, it } from 'vitest'
import {
  getProductWidgetDef,
  isProductWidgetReady,
  listAllProductWidgets,
  listReadyProductWidgets,
  PRODUCT_WIDGET_DEFS,
} from './productWidgets'

describe('productWidgets registry', () => {
  it('tem featured/offers ready e bestsellers planned', () => {
    expect(getProductWidgetDef('featured')?.status).toBe('ready')
    expect(getProductWidgetDef('offers')?.status).toBe('ready')
    expect(getProductWidgetDef('bestsellers')?.status).toBe('planned')
    expect(isProductWidgetReady('bestsellers')).toBe(false)
  })

  it('listReady exclui planned; listAll inclui todos ordenados', () => {
    const ready = listReadyProductWidgets()
    expect(ready.every((w) => w.status === 'ready')).toBe(true)
    expect(ready.map((w) => w.kind)).toEqual(['featured', 'offers'])

    const all = listAllProductWidgets()
    expect(all).toHaveLength(PRODUCT_WIDGET_DEFS.length)
    expect(all.map((w) => w.sortOrder)).toEqual(
      [...all.map((w) => w.sortOrder)].sort((a, b) => a - b),
    )
  })
})
