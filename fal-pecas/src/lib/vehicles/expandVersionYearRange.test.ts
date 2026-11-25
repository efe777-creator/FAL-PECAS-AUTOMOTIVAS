import { describe, expect, it } from 'vitest'
import {
  assertVersionYearsWithinModelLife,
  formatVersionPeriodLabel,
  groupVersionsByConfig,
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
  })

  it('versionNaturalKey normaliza', () => {
    expect(
      versionNaturalKey({ year: 2010, engine: ' 1.4 ', versionName: ' TFSI ' }),
    ).toBe('2010|1.4|tfsi')
  })

  it('groupVersionsByConfig deriva período min–max', () => {
    const groups = groupVersionsByConfig([
      { year: 2012, engine: '1.4', versionName: 'TFSI', status: 'active' },
      { year: 2010, engine: '1.4', versionName: 'TFSI', status: 'active' },
      { year: 2011, engine: '1.4', versionName: 'TFSI', status: 'inactive' },
      { year: 2015, engine: '2.0', versionName: 'Sport', status: 'active' },
    ])
    expect(groups).toHaveLength(2)
    const tfsi = groups.find((g) => g.engine === '1.4')!
    expect(tfsi.yearStart).toBe(2010)
    expect(tfsi.yearEnd).toBe(2012)
    expect(tfsi.years).toEqual([2010, 2011, 2012])
    expect(tfsi.activeCount).toBe(2)
    expect(formatVersionPeriodLabel(2010, 2019)).toBe('2010–2019')
    expect(formatVersionPeriodLabel(2010, 2010)).toBe('2010')
  })
})
