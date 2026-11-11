import { describe, expect, it } from 'vitest'
import { buildCatalogSearchParams } from './buildCatalogSearchParams'
import { interpretSearchQuery } from './interpretSearchQuery'

const catalog = [{ maker: 'Hyundai', model: 'HB20' }]

describe('buildCatalogSearchParams', () => {
  it('HB20 2015 vira model+year sem q poluído', () => {
    const intent = interpretSearchQuery('HB20 2015', catalog)
    const { searchParams, catalogParams } = buildCatalogSearchParams(intent)
    expect(searchParams.get('model')).toBe('HB20')
    expect(searchParams.get('year')).toBe('2015')
    expect(searchParams.get('maker')).toBe('Hyundai')
    expect(searchParams.get('q')).toBeNull()
    expect(catalogParams.model).toBe('HB20')
    expect(catalogParams.year).toBe('2015')
    expect(catalogParams.q).toBeUndefined()
  })

  it('terminal HB20 2015 mantém q=terminal', () => {
    const intent = interpretSearchQuery('terminal HB20 2015', catalog)
    const { searchParams } = buildCatalogSearchParams(intent)
    expect(searchParams.get('q')?.toLowerCase()).toBe('terminal')
    expect(searchParams.get('model')).toBe('HB20')
  })
})
