import { describe, expect, it } from 'vitest'
import { excludeProductsById } from './homeSections'

describe('excludeProductsById', () => {
  it('remove ids presentes em ofertas', () => {
    const featured = [{ id: 'a' }, { id: 'b' }, { id: 'c' }]
    const offers = [{ id: 'b' }]
    expect(excludeProductsById(featured, offers).map((p) => p.id)).toEqual(['a', 'c'])
  })

  it('não altera se ofertas vazias', () => {
    const featured = [{ id: 'a' }]
    expect(excludeProductsById(featured, [])).toEqual(featured)
  })
})
