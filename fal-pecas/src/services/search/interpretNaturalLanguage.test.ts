import { describe, expect, it } from 'vitest'
import { mergeSearchIntent } from './interpretNaturalLanguage'
import type { SearchIntent, VehicleCatalogEntry } from './interpretSearchQuery'

const catalog: VehicleCatalogEntry[] = [
  { maker: 'Hyundai', model: 'HB20', versions: ['Unique'] },
  { maker: 'Fiat', model: 'Palio', versions: [] },
]

const base = (over: Partial<SearchIntent> = {}): SearchIntent => ({
  raw: 'x',
  productQuery: null,
  vehicle: {},
  needsClarification: false,
  confidence: 'medium',
  ...over,
})

describe('mergeSearchIntent', () => {
  it('descarta version One ausente no cadastro HB20 e pede clarificação', () => {
    const merged = mergeSearchIntent(
      base({ vehicle: { maker: 'Hyundai', model: 'HB20', year: '2015' } }),
      {
        vehicle: { maker: 'Hyundai', model: 'HB20', year: '2015', version: 'One' },
        confidence: 'high',
      },
      catalog,
    )
    expect(merged.vehicle.version).toBeUndefined()
    expect(merged.needsClarification).toBe(true)
    expect(merged.clarification).toBe('version')
  })

  it('mantém Unique canônica do cadastro', () => {
    const merged = mergeSearchIntent(
      base(),
      {
        vehicle: { model: 'HB20', version: 'unique', year: '2015' },
        productQuery: null,
      },
      catalog,
    )
    expect(merged.vehicle.model).toBe('HB20')
    expect(merged.vehicle.maker).toBe('Hyundai')
    expect(merged.vehicle.version).toBe('Unique')
    expect(merged.needsClarification).toBe(false)
  })

  it('aplica productQuery e veículo do LLM sem inventar versão', () => {
    const merged = mergeSearchIntent(
      base({ confidence: 'low' }),
      {
        productQuery: 'pivo',
        vehicle: { maker: 'Fiat', model: 'Palio', year: '2010' },
        confidence: 'high',
      },
      catalog,
    )
    expect(merged.productQuery).toBe('pivo')
    expect(merged.vehicle.model).toBe('Palio')
    expect(merged.vehicle.year).toBe('2010')
    expect(merged.vehicle.version).toBeUndefined()
  })
})
