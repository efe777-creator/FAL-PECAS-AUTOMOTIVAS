import { describe, expect, it } from 'vitest'
import {
  buildCampaignCatalogHref,
  inferCampaignLinkKind,
  normalizeCampaignProductIds,
  parseCampaignCatalogHref,
  parseCatalogProductIdsParam,
} from '@/lib/homeCampaignLink'

describe('homeCampaignLink (Notes #18 + composto)', () => {
  it('normalize/parse ids', () => {
    expect(normalizeCampaignProductIds('a, b  c')).toEqual(['a', 'b', 'c'])
    expect(parseCatalogProductIdsParam('x,y')).toEqual(['x', 'y'])
  })

  it('build catalog / category / products / vehicle', () => {
    expect(buildCampaignCatalogHref({ kind: 'catalog' })).toBe('/catalogo')
    expect(buildCampaignCatalogHref({ kind: 'category', categorySlug: 'freios' })).toBe(
      '/catalogo?cat=freios',
    )
    expect(
      buildCampaignCatalogHref({
        kind: 'products',
        productIds: ['p1', 'p2'],
      }),
    ).toBe('/catalogo?ids=p1%2Cp2')
    const veh = buildCampaignCatalogHref({
      kind: 'vehicle',
      vehicle: { maker: 'Toyota', model: 'Corolla', year: '2020' },
    })
    expect(veh).toContain('maker=Toyota')
    expect(veh).toContain('model=Corolla')
    expect(veh).toContain('year=2020')
    expect(veh).toContain('vehicle=1')
  })

  it('products XOR — não anexa cat/veículo', () => {
    const href = buildCampaignCatalogHref({
      kind: 'products',
      productIds: ['p1'],
      categorySlug: 'freios',
      vehicle: { maker: 'Fiat', model: 'Argo' },
    })
    expect(href).toBe('/catalogo?ids=p1')
    expect(href).not.toContain('cat=')
    expect(href).not.toContain('maker=')
  })

  it('filter: Onix+Prisma+Cobalt × cats (união)', () => {
    const href = buildCampaignCatalogHref({
      kind: 'filter',
      categorySlugs: ['suspensao', 'bieleta', 'amortecedor'],
      vehicle: {
        maker: 'Chevrolet',
        models: ['Onix', 'Prisma', 'Cobalt'],
      },
    })
    expect(href).toContain('cat=suspensao%2Cbieleta%2Camortecedor')
    expect(href).toContain('maker=Chevrolet')
    expect(href).toContain('model=Onix%2CPrisma%2CCobalt')
    expect(href).toContain('vehicle=1')
    expect(inferCampaignLinkKind(href)).toBe('filter')
  })

  it('category + vehicle no mesmo href → filter no infer', () => {
    const href = buildCampaignCatalogHref({
      kind: 'category',
      categorySlug: 'suspensao',
      vehicle: { maker: 'VW', model: 'Gol' },
    })
    expect(href).toContain('cat=suspensao')
    expect(href).toContain('maker=VW')
    expect(href).toContain('model=Gol')
  })

  it('infer + parse round-trip', () => {
    expect(inferCampaignLinkKind('/catalogo')).toBe('catalog')
    expect(inferCampaignLinkKind('/catalogo?ids=a,b')).toBe('products')
    expect(inferCampaignLinkKind('/catalogo?cat=freios')).toBe('category')
    expect(inferCampaignLinkKind('/catalogo?maker=Fiat&model=Argo')).toBe('vehicle')
    expect(inferCampaignLinkKind('/conta')).toBe('manual')

    const parsed = parseCampaignCatalogHref(
      '/catalogo?cat=bieleta,amortecedor&maker=Chevrolet&model=Onix,Prisma&vehicle=1',
    )
    expect(parsed.kind).toBe('filter')
    expect(parsed.categorySlugs).toEqual(['bieleta', 'amortecedor'])
    expect(parsed.vehicle?.models).toEqual(['Onix', 'Prisma'])
  })
})
