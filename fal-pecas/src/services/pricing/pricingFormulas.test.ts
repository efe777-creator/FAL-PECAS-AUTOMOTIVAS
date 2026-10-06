import { describe, expect, it } from 'vitest'
import { previewCalculatedPrice } from '@/services/admin/adminPriceListService'

describe('previewCalculatedPrice (F8.1-E)', () => {
  it('markup e margem com extra_cost', () => {
    const markup = previewCalculatedPrice({
      baseCost: 40,
      extraCost: 2,
      method: 'markup_on_cost',
      percent: 30,
    })
    expect(markup.costTotal).toBe(42)
    expect(markup.price).toBe(54.6)
    expect(markup.error).toBeNull()

    const margin = previewCalculatedPrice({
      baseCost: 40,
      extraCost: 2,
      method: 'margin_on_sell',
      percent: 30,
    })
    expect(margin.price).toBe(60)
  })

  it('custo ausente', () => {
    const r = previewCalculatedPrice({
      baseCost: null,
      extraCost: 0,
      method: 'margin_on_sell',
      percent: 30,
    })
    expect(r.price).toBeNull()
    expect(r.error).toMatch(/Custo ausente/)
  })

  it('margem inválida', () => {
    const r = previewCalculatedPrice({
      baseCost: 100,
      extraCost: 0,
      method: 'margin_on_sell',
      percent: 100,
    })
    expect(r.price).toBeNull()
    expect(r.error).toMatch(/100/)
  })

  it('fixed não calcula', () => {
    const r = previewCalculatedPrice({
      baseCost: 100,
      extraCost: 0,
      method: 'fixed',
      percent: 30,
    })
    expect(r.price).toBeNull()
    expect(r.error).toMatch(/fixo/)
  })
})
