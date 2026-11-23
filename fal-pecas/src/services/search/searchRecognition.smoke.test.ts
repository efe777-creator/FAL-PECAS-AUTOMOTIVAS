/**
 * Smoke — reconhecimento inteligente no campo de busca (aceitação MARCHA).
 */
import { describe, expect, it } from 'vitest'
import {
  applyIntentToSearchParams,
  buildCatalogSearchParams,
} from './buildCatalogSearchParams'
import { interpretSearchQuery } from './interpretSearchQuery'

/** Espelha mestre loja: I30 maiúsculo, verified models. */
const storeCatalog = [
  { maker: 'Hyundai', model: 'HB20', versions: ['Unique'] },
  { maker: 'Hyundai', model: 'I30' },
  { maker: 'Kia', model: 'Cerato' },
  { maker: 'Fiat', model: 'Palio' },
]

function recognize(raw: string) {
  const intent = interpretSearchQuery(raw, storeCatalog)
  const { catalogParams, searchParams } = buildCatalogSearchParams(intent)
  return { intent, catalogParams, searchParams }
}

describe('smoke campo de busca — reconhecimento de carros', () => {
  it('I30 → Hyundai + I30 na URL; sem q; sem Palio', () => {
    const { intent, searchParams } = recognize('I30')
    expect(intent.vehicle.maker).toBe('Hyundai')
    expect(intent.vehicle.model?.toLowerCase()).toBe('i30')
    expect(searchParams.get('maker')).toBe('Hyundai')
    expect(searchParams.get('model')?.toLowerCase()).toBe('i30')
    expect(searchParams.get('q')).toBeNull()
  })

  it('HB20, Palio e Cerato → maker/model corretos', () => {
    expect(recognize('HB20').intent.vehicle).toMatchObject({
      maker: 'Hyundai',
      model: 'HB20',
    })
    expect(recognize('Palio').intent.vehicle).toMatchObject({
      maker: 'Fiat',
      model: 'Palio',
    })
    expect(recognize('Cerato').intent.vehicle).toMatchObject({
      maker: 'Kia',
      model: 'Cerato',
    })
    expect(recognize('cerato').searchParams.get('maker')).toBe('Kia')
  })

  it('axial I30 → peça + veículo', () => {
    const { intent, searchParams } = recognize('axial I30')
    expect(intent.productQuery?.toLowerCase()).toContain('axial')
    expect(searchParams.get('model')?.toLowerCase()).toBe('i30')
    expect(searchParams.get('q')?.toLowerCase()).toContain('axial')
  })

  it('YMM stale Palio + q=I30 → intent vence', () => {
    const { catalogParams } = recognize('I30')
    const effective = applyIntentToSearchParams(
      { q: 'I30', maker: 'Fiat', model: 'Palio' },
      catalogParams,
    )
    expect(effective.maker).toBe('Hyundai')
    expect(effective.model?.toLowerCase()).toBe('i30')
    expect(effective.q).toBeUndefined()
  })

  it('texto livre não inventa veículo', () => {
    const { intent, searchParams } = recognize('bosta')
    expect(intent.vehicle.model).toBeUndefined()
    expect(searchParams.get('q')?.toLowerCase()).toBe('bosta')
    expect(searchParams.get('model')).toBeNull()
  })
})
