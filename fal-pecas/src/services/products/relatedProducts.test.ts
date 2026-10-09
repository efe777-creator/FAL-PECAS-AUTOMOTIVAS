import { describe, expect, it } from 'vitest'
import { pickRelatedProducts } from '@/services/products/relatedProducts'
import type { Product } from '@/types'

function p(partial: Partial<Product> & { id: string }): Product {
  return {
    sku: partial.id,
    name: partial.name ?? partial.id,
    slug: partial.id,
    price: 10,
    ...partial,
  }
}

describe('pickRelatedProducts (MARCHA PDP-D)', () => {
  it('exclui o produto atual', () => {
    const out = pickRelatedProducts(
      [p({ id: 'a' }), p({ id: 'b' }), p({ id: 'c' })],
      { excludeId: 'a', limit: 4 },
    )
    expect(out.map((x) => x.id)).toEqual(['b', 'c'])
  })

  it('prefere disponíveis e respeita limit', () => {
    const out = pickRelatedProducts(
      [
        p({ id: 'x', available: false }),
        p({ id: 'y', available: true }),
        p({ id: 'z', available: true }),
        p({ id: 'w', available: false }),
      ],
      { excludeId: 'self', limit: 2 },
    )
    expect(out.map((x) => x.id)).toEqual(['y', 'z'])
  })

  it('vazio se só o próprio ou pool vazio', () => {
    expect(pickRelatedProducts([], { excludeId: 'a' })).toEqual([])
    expect(pickRelatedProducts([p({ id: 'a' })], { excludeId: 'a' })).toEqual([])
  })
})
