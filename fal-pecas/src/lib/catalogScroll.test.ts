import { describe, expect, it } from 'vitest'
import { catalogScrollStorageKey } from '@/lib/catalogScroll'

describe('catalogScrollStorageKey', () => {
  it('combina pathname e search', () => {
    expect(catalogScrollStorageKey('/catalogo', '?q=filtro')).toBe(
      'fal:catalog-scroll:/catalogo?q=filtro',
    )
  })
})
