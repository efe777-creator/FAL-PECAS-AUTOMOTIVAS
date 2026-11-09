import { describe, expect, it } from 'vitest'
import { excludeProductsById, mergeFeaturedHybrid } from './homeSections'

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

describe('mergeFeaturedHybrid', () => {
  it('preserva curados e completa vagas sem duplicar', () => {
    const curated = [{ id: 'c1' }, { id: 'c2' }]
    const automatic = [{ id: 'c2' }, { id: 'a1' }, { id: 'a2' }, { id: 'a3' }]
    expect(mergeFeaturedHybrid(curated, automatic, 4).map((p) => p.id)).toEqual([
      'c1',
      'c2',
      'a1',
      'a2',
    ])
  })

  it('se curadoria cobre o limite, não acrescenta automático', () => {
    const curated = [{ id: 'c1' }, { id: 'c2' }, { id: 'c3' }]
    const automatic = [{ id: 'a1' }]
    expect(mergeFeaturedHybrid(curated, automatic, 2).map((p) => p.id)).toEqual(['c1', 'c2'])
  })

  it('com curadoria vazia, usa só automáticos', () => {
    expect(mergeFeaturedHybrid([], [{ id: 'a1' }, { id: 'a2' }], 2).map((p) => p.id)).toEqual([
      'a1',
      'a2',
    ])
  })
})
