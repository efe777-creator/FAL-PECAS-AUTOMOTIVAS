import { describe, expect, it } from 'vitest'
import {
  applyIntentToSearchParams,
  buildCatalogSearchParams,
} from './buildCatalogSearchParams'
import { interpretSearchQuery } from './interpretSearchQuery'

const catalog = [
  { maker: 'Hyundai', model: 'HB20' },
  { maker: 'Hyundai', model: 'i30' },
  { maker: 'Fiat', model: 'Palio' },
]

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

  it('I30 → maker+model canônicos, sem q', () => {
    const intent = interpretSearchQuery('I30', catalog)
    const { searchParams, catalogParams } = buildCatalogSearchParams(intent)
    expect(searchParams.get('maker')).toBe('Hyundai')
    expect(searchParams.get('model')?.toLowerCase()).toBe('i30')
    expect(searchParams.get('q')).toBeNull()
    expect(catalogParams.maker).toBe('Hyundai')
    expect(catalogParams.model?.toLowerCase()).toBe('i30')
    expect(catalogParams.q).toBeUndefined()
  })
})

describe('applyIntentToSearchParams', () => {
  it('Palio stale + q=I30 → intent i30 vence; sem q', () => {
    const intent = interpretSearchQuery('I30', catalog)
    const { catalogParams } = buildCatalogSearchParams(intent)
    const effective = applyIntentToSearchParams(
      { q: 'I30', maker: 'Fiat', model: 'Palio' },
      catalogParams,
    )
    expect(effective.maker).toBe('Hyundai')
    expect(effective.model?.toLowerCase()).toBe('i30')
    expect(effective.q).toBeUndefined()
  })

  it('pivô I30 → q da peça + YMM i30', () => {
    const intent = interpretSearchQuery('pivô I30', catalog)
    const { catalogParams } = buildCatalogSearchParams(intent)
    const effective = applyIntentToSearchParams(
      { q: 'pivô I30', maker: 'Fiat', model: 'Palio' },
      catalogParams,
    )
    expect(effective.maker).toBe('Hyundai')
    expect(effective.model?.toLowerCase()).toBe('i30')
    expect(effective.q?.toLowerCase()).toMatch(/piv/)
  })

  it('só texto bosta sem veículo no intent: preserva YMM e q', () => {
    const intent = interpretSearchQuery('bosta', catalog)
    const { catalogParams } = buildCatalogSearchParams(intent)
    const effective = applyIntentToSearchParams(
      { q: 'bosta', maker: 'Fiat', model: 'Palio' },
      catalogParams,
    )
    expect(effective.maker).toBe('Fiat')
    expect(effective.model).toBe('Palio')
    expect(effective.q?.toLowerCase()).toBe('bosta')
  })
})
