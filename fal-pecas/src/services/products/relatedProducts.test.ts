import { describe, expect, it } from 'vitest'
import {
  mergeRelatedProducts,
  pickRelatedProducts,
} from '@/services/products/relatedProducts'
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

describe('mergeRelatedProducts (Onda 4 · curadoria)', () => {
  it('prioriza curados e completa com fallback', () => {
    const out = mergeRelatedProducts(
      [p({ id: 'c1' }), p({ id: 'c2' })],
      [p({ id: 'f1' }), p({ id: 'f2' }), p({ id: 'f3' })],
      { excludeId: 'self', limit: 4 },
    )
    expect(out.map((x) => x.id)).toEqual(['c1', 'c2', 'f1', 'f2'])
  })

  it('não duplica curado que também está no fallback', () => {
    const out = mergeRelatedProducts(
      [p({ id: 'x' })],
      [p({ id: 'x' }), p({ id: 'y' })],
      { excludeId: 'self', limit: 4 },
    )
    expect(out.map((x) => x.id)).toEqual(['x', 'y'])
  })

  it('só curados se já enchem o limit', () => {
    const out = mergeRelatedProducts(
      [p({ id: 'a' }), p({ id: 'b' }), p({ id: 'c' }), p({ id: 'd' })],
      [p({ id: 'z' })],
      { excludeId: 'self', limit: 4 },
    )
    expect(out.map((x) => x.id)).toEqual(['a', 'b', 'c', 'd'])
  })
})
