import { describe, expect, it } from 'vitest'
import {
  assertVersionYearsWithinModelLife,
  formatVersionPeriodLabel,
  groupVersionsByConfig,
  versionConfigGroupKey,
  versionNaturalKey,
  yearsInInclusiveRange,
} from '@/lib/vehicles/expandVersionYearRange'

describe('expandVersionYearRange', () => {
  it('yearsInInclusiveRange lista anos inclusivos', () => {
    expect(yearsInInclusiveRange(2010, 2013)).toEqual([2010, 2011, 2012, 2013])
    expect(yearsInInclusiveRange(2013, 2010)).toEqual([2010, 2011, 2012, 2013])
  })

  it('yearsInInclusiveRange rejeita span > 40', () => {
    expect(() => yearsInInclusiveRange(1980, 2030)).toThrow(/40/)
  })

  it('assert exige vida do modelo', () => {
    expect(() =>
      assertVersionYearsWithinModelLife({
        yearStart: 2010,
        yearEnd: 2012,
        productionYearStart: null,
        productionYearEnd: null,
      }),
    ).toThrow(/Linha desde/)
  })

  it('assert rejeita fora da vida', () => {
    expect(() =>
      assertVersionYearsWithinModelLife({
        yearStart: 2008,
        yearEnd: 2010,
        productionYearStart: 2010,
        productionYearEnd: 2015,
      }),
    ).toThrow(/entre 2010 e 2015/)
  })

  it('assert aceita faixa contida e devolve anos', () => {
    const r = assertVersionYearsWithinModelLife({
      yearStart: 2011,
      yearEnd: 2013,
      productionYearStart: 2010,
      productionYearEnd: 2015,
    })
    expect(r.years).toEqual([2011, 2012, 2013])
    expect(r.openEnded).toBe(false)
  })

  it('assert Ano fim vazio = vigente até fim da linha do modelo', () => {
    const r = assertVersionYearsWithinModelLife({
      yearStart: 2012,
      yearEnd: null,
      productionYearStart: 2010,
      productionYearEnd: 2015,
    })
    expect(r.openEnded).toBe(true)
    expect(r.yearEnd).toBe(2015)
    expect(r.years[0]).toBe(2012)
    expect(r.years[r.years.length - 1]).toBe(2015)
  })

  it('formatVersionPeriodLabel usa yy e vigente como /...', () => {
    expect(formatVersionPeriodLabel(2010, 2026, { openEnded: true })).toBe('10/...')
    expect(formatVersionPeriodLabel(2022, 2022)).toBe('22')
    expect(formatVersionPeriodLabel(2010, 2015)).toBe('10/15')
  })

  it('versionNaturalKey normaliza com fuel', () => {
    expect(
      versionNaturalKey({ year: 2010, engine: ' 1.4 ', versionName: ' TFSI ' }),
    ).toBe('2010|1.4|tfsi|')
    expect(
      versionNaturalKey({
        year: 2010,
        engine: '1.4',
        versionName: 'TFSI',
        fuel: ' Flex ',
      }),
    ).toBe('2010|1.4|tfsi|flex')
  })

  it('groupVersionsByConfig deriva período min–max só de ativos e ordena por ano', () => {
    const groups = groupVersionsByConfig([
      { year: 2015, engine: '2.0', versionName: 'Sport', status: 'active' },
      { year: 2012, engine: '1.4', versionName: 'TFSI', status: 'active' },
      { year: 2010, engine: '1.4', versionName: 'TFSI', status: 'active' },
      { year: 2011, engine: '1.4', versionName: 'TFSI', status: 'inactive' },
    ])
    expect(groups).toHaveLength(2)
    expect(groups[0]?.engine).toBe('1.4')
    expect(groups[0]?.yearStart).toBe(2010)
    expect(groups[1]?.engine).toBe('2.0')
    expect(groups[1]?.yearStart).toBe(2015)
    const tfsi = groups[0]!
    // 2011 inativo não entra no período exibido
    expect(tfsi.years).toEqual([2010, 2012])
    expect(tfsi.activeCount).toBe(2)
    expect(tfsi.rows).toHaveLength(3)
    expect(formatVersionPeriodLabel(2010, 2019)).toBe('10/19')
    expect(formatVersionPeriodLabel(2010, 2010)).toBe('10')
  })

  it('groupVersionsByConfig distingue Flex ≠ Diesel na mesma motorização/versão', () => {
    const groups = groupVersionsByConfig([
      { year: 2018, engine: '2.0', versionName: 'Ambiente', fuel: 'Flex', status: 'active' },
      { year: 2019, engine: '2.0', versionName: 'Ambiente', fuel: 'Flex', status: 'active' },
      { year: 2018, engine: '2.0', versionName: 'Ambiente', fuel: 'Diesel', status: 'active' },
    ])
    expect(groups).toHaveLength(2)
    const fuels = groups.map((g) => g.fuel).sort()
    expect(fuels).toEqual(['Diesel', 'Flex'])
    expect(versionConfigGroupKey({ engine: '2.0', versionName: 'Ambiente', fuel: 'Flex' })).not.toBe(
      versionConfigGroupKey({ engine: '2.0', versionName: 'Ambiente', fuel: 'Diesel' }),
    )
  })

  it('groupVersionsByConfig ignora anos inativos ao encolher período', () => {
    const groups = groupVersionsByConfig([
      { year: 1996, engine: '1.6', versionName: null, status: 'inactive' },
      { year: 2000, engine: '1.6', versionName: null, status: 'inactive' },
      { year: 2022, engine: '1.6', versionName: null, status: 'active' },
      { year: 2023, engine: '1.6', versionName: null, status: 'active' },
    ])
    const g = groups[0]!
    expect(g.yearStart).toBe(2022)
    expect(g.yearEnd).toBe(2023)
    expect(g.years).toEqual([2022, 2023])
  })
})
