import { describe, expect, it } from 'vitest'
import { displayPrice } from '@/services/pricing/priceResolutionService'
import type { Product } from '@/types'

function baseProduct(partial: Partial<Product>): Product {
  return {
    id: 'p1',
    sku: 'SKU',
    name: 'Peça',
    slug: 'peca',
    price: 100,
    available: true,
    status: 'published',
    ...partial,
  } as Product
}

describe('displayPrice (C-04 legado vs resolved)', () => {
  it('prioriza resolvedPrice sobre promo_price legado', () => {
    const p = baseProduct({
      price: 100,
      promoPrice: 50,
      resolvedPrice: 40,
      listPrice: 100,
    })
    expect(displayPrice(p)).toBe(40)
  })

  it('fallback promoPrice só se resolved ausente', () => {
    const p = baseProduct({ price: 100, promoPrice: 55, resolvedPrice: undefined })
    expect(displayPrice(p)).toBe(55)
  })

  it('fallback price se sem resolved/promo', () => {
    const p = baseProduct({ price: 100, promoPrice: null, resolvedPrice: undefined })
    expect(displayPrice(p)).toBe(100)
  })
})
