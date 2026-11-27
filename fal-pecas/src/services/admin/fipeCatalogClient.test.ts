import { describe, expect, it } from 'vitest'
import { fipeSelectionToIntelligenceRows, parseFipeYearLabel } from './fipeCatalogClient'

describe('fipeCatalogClient helpers', () => {
  it('parseFipeYearLabel extrai ano e combustível', () => {
    expect(parseFipeYearLabel('2020-5', '2020 Flex')).toEqual({ year: 2020, fuel: 'Flex' })
    expect(parseFipeYearLabel('2018-1', '2018 Gasolina')).toEqual({
      year: 2018,
      fuel: 'Gasolina',
    })
  })

  it('fipeSelectionToIntelligenceRows monta linhas com fuel', () => {
    const rows = fipeSelectionToIntelligenceRows({
      brandName: 'Honda',
      modelName: 'Civic Sedan EXL 2.0 Flex 16V Aut.4p',
      years: [
        { code: '2020-5', name: '2020 Flex', year: 2020, fuel: 'Flex' },
      ],
    })
    expect(rows).toHaveLength(1)
    expect(rows[0]!.montadora).toBe('Honda')
    expect(rows[0]!.ano).toBe('2020')
    expect(rows[0]!.combustivel).toBe('Flex')
    expect(rows[0]!.modelo.length).toBeGreaterThan(0)
  })
})
