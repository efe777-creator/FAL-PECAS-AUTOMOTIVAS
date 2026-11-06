import { describe, expect, it } from 'vitest'
import {
  YEAR_NO_START_LABEL,
  expandYearsForSelector,
  formatVehicleAppYear,
  toYy,
  yearMatchesVehicleApp,
} from '@/lib/vehicleAppYear'

describe('vehicleAppYear (MARCHA UI)', () => {
  it('toYy — abreviação e virada de século', () => {
    expect(toYy(1997)).toBe('97')
    expect(toYy(2005)).toBe('05')
    expect(toYy(2012)).toBe('12')
    expect(toYy(2022)).toBe('22')
    expect(toYy(1949)).toBeNull()
    expect(toYy(2101)).toBeNull()
  })

  it('formatVehicleAppYear — início e fim', () => {
    expect(formatVehicleAppYear({ yearStart: 2000, yearEnd: 2005 })).toBe('00/05')
    expect(formatVehicleAppYear({ yearStart: 2020, yearEnd: 2022 })).toBe('20/22')
    expect(formatVehicleAppYear({ yearStart: 2010, yearEnd: 2010 })).toBe('10')
  })

  it('formatVehicleAppYear — só início → YY/...', () => {
    expect(formatVehicleAppYear({ yearStart: 1997, yearEnd: null })).toBe('97/...')
    expect(formatVehicleAppYear({ yearStart: 2012, yearEnd: null })).toBe('12/...')
  })

  it('formatVehicleAppYear — só fim → .../YY (mostra o fim conhecido)', () => {
    expect(formatVehicleAppYear({ yearStart: null, yearEnd: 2010 })).toBe('.../10')
    expect(formatVehicleAppYear({ yearStart: null, yearEnd: 1997 })).toBe('.../97')
    expect(YEAR_NO_START_LABEL).toBe('Sem ano inicial')
  })

  it('formatVehicleAppYear — ambos ausentes / legado / inválido', () => {
    expect(formatVehicleAppYear({})).toBeNull()
    expect(formatVehicleAppYear({ versionYear: 2012 })).toBe('12')
    expect(formatVehicleAppYear({ yearStart: 1800, yearEnd: 2000 })).toBeNull()
    expect(formatVehicleAppYear({ yearStart: 2000, yearEnd: 9999 })).toBeNull()
  })

  it('yearMatchesVehicleApp — alinhado ao SQL (inalterado)', () => {
    expect(yearMatchesVehicleApp(2000, 1997, null)).toBe(true)
    expect(yearMatchesVehicleApp(1996, 1997, null)).toBe(false)
    expect(yearMatchesVehicleApp(2003, 2000, 2005)).toBe(true)
    expect(yearMatchesVehicleApp(2006, 2000, 2005)).toBe(false)
    expect(yearMatchesVehicleApp(2012, null, null, 2012)).toBe(true)
    expect(yearMatchesVehicleApp(2012, null, null, null)).toBe(false)
  })

  it('expandYearsForSelector', () => {
    expect(expandYearsForSelector(2000, 2002)).toEqual([2002, 2001, 2000])
    expect(expandYearsForSelector(1997, null)).toEqual([1997])
  })
})
