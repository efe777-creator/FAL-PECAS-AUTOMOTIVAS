import { describe, expect, it } from 'vitest'
import { productHasActivePromo } from './productService'
import type { Product } from '@/types'

function base(partial: Partial<Product>): Product {
  return {
    id: 'p1',
    sku: 'SKU',
    commercialRef: 'SKU',
    name: 'Peça',
    slug: 'peca',
    price: 100,
    status: 'published',
    available: true,
    ...partial,
  }
}

describe('productHasActivePromo', () => {
  it('detecta promoPrice abaixo da lista', () => {
    expect(productHasActivePromo(base({ price: 100, promoPrice: 80 }))).toBe(true)
  })

  it('detecta resolvedPrice abaixo de listPrice', () => {
    expect(
      productHasActivePromo(base({ price: 100, listPrice: 100, resolvedPrice: 70 })),
    ).toBe(true)
  })

  it('rejeita sem desconto ou indisponível', () => {
    expect(productHasActivePromo(base({ price: 100, promoPrice: 100 }))).toBe(false)
    expect(productHasActivePromo(base({ price: 100, promoPrice: 80, available: false }))).toBe(
      false,
    )
  })
})
