import { describe, expect, it } from 'vitest'
import { partitionFavoriteRows, type FavoriteUnavailableItem } from './favoriteService'
import type { Product } from '@/types'

function pub(id: string): Product {
  return {
    id,
    sku: `SKU-${id}`,
    commercialRef: `SKU-${id}`,
    name: `Peça ${id}`,
    slug: `peca-${id}`,
    price: 10,
    status: 'published',
    available: true,
  }
}

describe('partitionFavoriteRows', () => {
  it('separa published da lista indisponível', () => {
    const orphan: FavoriteUnavailableItem = {
      productId: 'x',
      name: 'Sumiu',
      sku: 'X1',
      status: 'archived',
    }
    const archived = { ...pub('a'), status: 'archived' as const }
    const result = partitionFavoriteRows([pub('p1'), archived, orphan])
    expect(result.products.map((p) => p.id)).toEqual(['p1'])
    expect(result.unavailable).toEqual([
      { productId: 'a', name: 'Peça a', sku: 'SKU-a', status: 'archived' },
      orphan,
    ])
  })
})
