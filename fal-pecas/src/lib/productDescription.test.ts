import { describe, expect, it } from 'vitest'
import {
  DESC_COLLAPSE_CHARS,
  buildCatalogBrowseHref,
  buildCatalogMakerFilterHref,
  buildPdpCatalogFilterLink,
  joinProductDescription,
  needsDescriptionCollapse,
  truncateDescription,
} from '@/lib/productDescription'

describe('productDescription (MARCHA PDP-C)', () => {
  it('join sem duplicar short===long', () => {
    expect(joinProductDescription('Abc', 'Abc')).toBe('Abc')
    expect(joinProductDescription('Curta', 'Longa detalhada')).toBe('Curta\n\nLonga detalhada')
    expect(joinProductDescription('', 'Só longa')).toBe('Só longa')
  })

  it('collapse só acima do limiar', () => {
    expect(needsDescriptionCollapse('x'.repeat(DESC_COLLAPSE_CHARS))).toBe(false)
    expect(needsDescriptionCollapse('x'.repeat(DESC_COLLAPSE_CHARS + 1))).toBe(true)
  })

  it('truncate termina com reticências e respeita palavra', () => {
    const words = Array.from({ length: 80 }, (_, i) => `palavra${i}`).join(' ')
    const out = truncateDescription(words, 40)
    expect(out.endsWith('…')).toBe(true)
    expect(out.length).toBeLessThan(words.length)
    expect(out.includes('palavra0')).toBe(true)
  })

  it('href catálogo com maker', () => {
    expect(buildCatalogMakerFilterHref(null)).toBe('/catalogo')
    expect(buildCatalogMakerFilterHref('  Chevrolet ')).toBe('/catalogo?maker=Chevrolet')
    expect(buildCatalogMakerFilterHref('A & B')).toBe('/catalogo?maker=A%20%26%20B')
  })

  it('PDP: uma montadora pré-filtra; várias abrem catálogo limpo', () => {
    expect(buildPdpCatalogFilterLink(['Chevrolet', 'chevrolet'])).toEqual({
      href: '/catalogo?maker=Chevrolet',
      hint: ' — outras peças da montadora Chevrolet',
    })
    expect(buildPdpCatalogFilterLink(['Chevrolet', 'Ford']).href).toBe('/catalogo')
    expect(buildPdpCatalogFilterLink(['Chevrolet', 'Ford']).hint).toBe(
      ' — outras peças no catálogo',
    )
    expect(buildPdpCatalogFilterLink([]).href).toBe('/catalogo')
  })

  it('Notes #9: Ver mais catálogo preserva cat + veículo', () => {
    expect(buildCatalogBrowseHref({})).toBe('/catalogo')
    expect(buildCatalogBrowseHref({ categorySlug: 'freios' })).toBe('/catalogo?cat=freios')
    const href = buildCatalogBrowseHref({
      categorySlug: 'freios',
      filter: { maker: 'Toyota', model: 'Corolla', year: '2020' },
    })
    expect(href).toContain('cat=freios')
    expect(href).toContain('maker=Toyota')
    expect(href).toContain('model=Corolla')
    expect(href).toContain('year=2020')
    expect(href).toContain('vehicle=1')
  })
})
