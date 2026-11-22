import { describe, expect, it } from 'vitest'
import {
  getProductWidgetDef,
  isProductWidgetReady,
  listAllProductWidgets,
  listReadyProductWidgets,
  PRODUCT_WIDGET_DEFS,
} from './productWidgets'

describe('productWidgets registry', () => {
  it('tem featured/offers/bestsellers ready; novidades/campanha planned', () => {
    expect(getProductWidgetDef('featured')?.status).toBe('ready')
    expect(getProductWidgetDef('offers')?.status).toBe('ready')
    expect(getProductWidgetDef('bestsellers')?.status).toBe('ready')
    expect(isProductWidgetReady('bestsellers')).toBe(true)
    expect(getProductWidgetDef('new_arrivals')?.status).toBe('planned')
  })

  it('offers (Notes #13) = Promoções + CTA ?promo=1', () => {
    const offers = getProductWidgetDef('offers')
    expect(offers?.title).toBe('Promoções')
    expect(offers?.linkLabel.toLowerCase()).toContain('promoções')
    expect(offers?.catalogHref).toBe('/catalogo?promo=1')
  })

  it('listReady exclui planned; listAll inclui todos ordenados', () => {
    const ready = listReadyProductWidgets()
    expect(ready.every((w) => w.status === 'ready')).toBe(true)
    expect(ready.map((w) => w.kind)).toEqual(['featured', 'offers', 'bestsellers'])

    const all = listAllProductWidgets()
    expect(all).toHaveLength(PRODUCT_WIDGET_DEFS.length)
    expect(all.map((w) => w.sortOrder)).toEqual(
      [...all.map((w) => w.sortOrder)].sort((a, b) => a - b),
    )
  })
})
