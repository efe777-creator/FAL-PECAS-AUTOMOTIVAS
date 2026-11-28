import { describe, expect, it } from 'vitest'
import { fipeSelectionToIntelligenceRows, fipeYearSpan, parseFipeYearLabel } from './fipeCatalogClient'

describe('fipeCatalogClient helpers', () => {
  it('parseFipeYearLabel extrai ano e combustível', () => {
    expect(parseFipeYearLabel('2020-5', '2020 Flex')).toEqual({ year: 2020, fuel: 'Flex' })
    expect(parseFipeYearLabel('2018-1', '2018 Gasolina')).toEqual({
      year: 2018,
      fuel: 'Gasolina',
    })
    expect(parseFipeYearLabel('1997-2', '1997 Álcool')).toEqual({ year: 1997, fuel: 'Etanol' })
    expect(parseFipeYearLabel('1992-3', '1992 Diesel')).toEqual({ year: 1992, fuel: 'Diesel' })
    expect(parseFipeYearLabel('2013-7', '2013 Gás Natural')).toEqual({ year: 2013, fuel: 'GNV' })
    expect(parseFipeYearLabel('2016-7', '2016')).toEqual({ year: 2016, fuel: 'GNV' })
    expect(parseFipeYearLabel('2014-1', '2014')).toEqual({ year: 2014, fuel: 'Gasolina' })
    expect(parseFipeYearLabel('1998-2', '1998')).toEqual({ year: 1998, fuel: 'Etanol' })
    expect(parseFipeYearLabel('1985-3', '1985')).toEqual({ year: 1985, fuel: 'Diesel' })
    expect(parseFipeYearLabel('2026-5', '2026 Flex')).toEqual({ year: 2026, fuel: 'Flex' })
    expect(parseFipeYearLabel('32000-5', '32000 Flex')).toBeNull()
    expect(parseFipeYearLabel('32000-1', '32000 Gasolina')).toBeNull()
    expect(parseFipeYearLabel('32000-7', '32000 Gás Natural')).toBeNull()
  })

  it('guarda cada ano real e não inventa o meio do buraco', () => {
    const span = fipeYearSpan([
      { code: '2026-5', name: '2026 Flex', year: 2026, fuel: 'Flex' },
      { code: '2019-5', name: '2019 Flex', year: 2019, fuel: 'Flex' },
      { code: '2024-5', name: '2024 Flex', year: 2024, fuel: 'Flex' },
      { code: '1997-2', name: '1997 Álcool', year: 1997, fuel: 'Etanol' },
      { code: '1999-2', name: '1999 Álcool', year: 1999, fuel: 'Etanol' },
    ])
    expect(span.filter((y) => y.fuel === 'Flex').map((y) => y.year)).toEqual([2019, 2024, 2026])
    expect(span.filter((y) => y.fuel === 'Etanol').map((y) => y.year)).toEqual([1997, 1999])
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

  it('GNV do ano vence o Flex escrito no nome Tetrafuel', () => {
    const rows = fipeSelectionToIntelligenceRows({
      brandName: 'Fiat',
      modelName: 'Grand Siena TETRAFUEL 1.4 Evo F. Flex 8V',
      years: [{ code: '2013-7', name: '2013 Gás Natural', year: 2013, fuel: 'GNV' }],
    })
    expect(rows[0]!.combustivel).toBe('GNV')
    expect(rows[0]!.versao.toLowerCase()).not.toContain('flex')
  })

  it('sem rótulo no ano, o nome ainda preenche diesel ou GNV', () => {
    const diesel = fipeSelectionToIntelligenceRows({
      brandName: 'Toyota',
      modelName: 'Hilux CD 4x4 2.8 Diesel',
      years: [{ code: '1994-0', name: '1994', year: 1994, fuel: null }],
    })
    expect(diesel[0]!.combustivel).toBe('Diesel')
    const gnv = fipeSelectionToIntelligenceRows({
      brandName: 'Fiat',
      modelName: 'Grand Siena TETRAFUEL 1.4 Evo F. Flex 8V',
      years: [{ code: '2013-0', name: '2013', year: 2013, fuel: null }],
    })
    expect(gnv[0]!.combustivel).toBe('GNV')
  })

  it('fipeSelectionToIntelligenceRows aceita N modelos (selections)', () => {
    const rows = fipeSelectionToIntelligenceRows({
      brandName: 'Hyundai',
      selections: [
        {
          modelName: 'HB20 1.0 Comfort',
          years: [{ code: '2020-5', name: '2020 Flex', year: 2020, fuel: 'Flex' }],
        },
        {
          modelName: 'HB20S 1.6 Premium',
          years: [
            { code: '2021-5', name: '2021 Flex', year: 2021, fuel: 'Flex' },
            { code: '2022-5', name: '2022 Flex', year: 2022, fuel: 'Flex' },
          ],
        },
      ],
    })
    expect(rows).toHaveLength(3)
    expect(rows.every((r) => r.montadora === 'Hyundai')).toBe(true)
    expect(rows.map((r) => r.ano).sort()).toEqual(['2020', '2021', '2022'])
  })

  it('fipeSelectionToIntelligenceRows aceita N montadoras', () => {
    const rows = fipeSelectionToIntelligenceRows({
      selections: [
        {
          brandName: 'Volkswagen',
          modelName: 'Gol 1.0',
          years: [{ code: '2018-5', name: '2018 Flex', year: 2018, fuel: 'Flex' }],
        },
        {
          brandName: 'Hyundai',
          modelName: 'HB20 1.0 Comfort',
          years: [{ code: '2020-5', name: '2020 Flex', year: 2020, fuel: 'Flex' }],
        },
      ],
    })
    expect(rows).toHaveLength(2)
    expect(rows.map((r) => r.montadora).sort()).toEqual(['Hyundai', 'Volkswagen'])
  })
})
