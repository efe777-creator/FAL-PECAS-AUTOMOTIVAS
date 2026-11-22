import { describe, expect, it } from 'vitest'
import {
  appendCatalogVehicleParams,
  buildCatalogHref,
  joinCatalogCsv,
  normalizeCatalogCsvList,
  parseCatalogCsvParam,
} from '@/lib/catalogHref'

describe('catalogHref (encoder canônico)', () => {
  it('normalize/parse CSV com teto e dedupe', () => {
    expect(normalizeCatalogCsvList('Onix, Prisma  Cobalt', 12)).toEqual([
      'Onix',
      'Prisma',
      'Cobalt',
    ])
    expect(parseCatalogCsvParam('a,a,b', 12)).toEqual(['a', 'b'])
    expect(joinCatalogCsv(['Onix', 'Prisma'])).toBe('Onix,Prisma')
  })

  it('YMM + vehicle=1', () => {
    const q = new URLSearchParams()
    appendCatalogVehicleParams(q, {
      maker: 'Chevrolet',
      model: 'Onix,Prisma,Cobalt',
      year: '2018',
    })
    expect(q.get('maker')).toBe('Chevrolet')
    expect(q.get('model')).toBe('Onix,Prisma,Cobalt')
    expect(q.get('year')).toBe('2018')
    expect(q.get('vehicle')).toBe('1')
  })

  it('buildCatalogHref cat + veículo', () => {
    const href = buildCatalogHref({
      categorySlug: ['bieleta', 'amortecedor'],
      filter: { maker: 'Chevrolet', model: 'Onix' },
    })
    expect(href).toContain('/catalogo?')
    expect(href).toContain('cat=bieleta%2Camortecedor')
    expect(href).toContain('maker=Chevrolet')
    expect(href).toContain('model=Onix')
    expect(href).toContain('vehicle=1')
  })

  it('vazio → /catalogo', () => {
    expect(buildCatalogHref({})).toBe('/catalogo')
  })
})
