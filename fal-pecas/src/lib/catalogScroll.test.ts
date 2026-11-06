import { describe, expect, it } from 'vitest'
import { catalogScrollSearchKey, catalogScrollStorageKey } from '@/lib/catalogScroll'

describe('catalogScrollSearchKey', () => {
  it('remove page da query', () => {
    expect(catalogScrollSearchKey('?q=filtro&page=3')).toBe('?q=filtro')
    expect(catalogScrollSearchKey('?page=2')).toBe('')
    expect(catalogScrollSearchKey('')).toBe('')
  })
})

describe('catalogScrollStorageKey', () => {
  it('combina pathname e search sem page', () => {
    expect(catalogScrollStorageKey('/catalogo', '?q=filtro&page=2')).toBe(
      'fal:catalog-scroll:/catalogo?q=filtro',
    )
  })
})
