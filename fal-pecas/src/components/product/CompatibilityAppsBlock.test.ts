import { describe, expect, it } from 'vitest'
import {
  countCompatibilityLines,
  prioritizeCompatibilityGroupsForVehicle,
  sliceCompatibilityGroups,
} from '@/components/product/CompatibilityAppsBlock'
import type { CompatibilityAppGroup } from '@/types'

function line(model: string, yearLabel = '20/22') {
  return { model, engine: null, version: null, yearLabel }
}

const sample: CompatibilityAppGroup[] = [
  { maker: 'Fiat', lines: [line('Uno'), line('Palio'), line('Mobi')] },
  { maker: 'Ford', lines: [line('Ka'), line('Fiesta'), line('Focus')] },
]

describe('sliceCompatibilityGroups (MARCHA UI)', () => {
  it('conta linhas na ordem dos grupos', () => {
    expect(countCompatibilityLines(sample)).toBe(6)
  })

  it('limiar 2 (card Notes #7): primeiras 2 linhas; maker só se tiver linha visível', () => {
    const sliced = sliceCompatibilityGroups(sample, 2)
    expect(sliced).toHaveLength(1)
    expect(sliced[0]).toEqual({
      maker: 'Fiat',
      lines: [line('Uno'), line('Palio')],
    })
  })

  it('limiar 4: primeiras 4 linhas; maker só se tiver linha visível', () => {
    const sliced = sliceCompatibilityGroups(sample, 4)
    expect(sliced).toHaveLength(2)
    expect(sliced[0]).toEqual({
      maker: 'Fiat',
      lines: [line('Uno'), line('Palio'), line('Mobi')],
    })
    expect(sliced[1].maker).toBe('Ford')
    expect(sliced[1].lines).toHaveLength(1)
    expect(sliced[1].lines[0].model).toBe('Ka')
  })

  it('exporta limiar card=2 e pdp=8', async () => {
    const { COMPAT_APPS_LINE_LIMIT } = await import('@/components/product/CompatibilityAppsBlock')
    expect(COMPAT_APPS_LINE_LIMIT.card).toBe(2)
    expect(COMPAT_APPS_LINE_LIMIT.pdp).toBe(8)
  })

  it('limiar 8 (pdp): retorna tudo quando total ≤ 8', () => {
    const sliced = sliceCompatibilityGroups(sample, 8)
    expect(countCompatibilityLines(sliced)).toBe(6)
    expect(sliced).toEqual(sample)
  })

  it('não inclui maker sem linhas no trecho', () => {
    const onlyFiat = sliceCompatibilityGroups(sample, 3)
    expect(onlyFiat).toHaveLength(1)
    expect(onlyFiat[0].maker).toBe('Fiat')
    expect(onlyFiat[0].lines).toHaveLength(3)
  })
})

describe('prioritizeCompatibilityGroupsForVehicle', () => {
  const multi: CompatibilityAppGroup[] = [
    { maker: 'Fiat', lines: [line('Palio'), line('Uno')] },
    { maker: 'Hyundai', lines: [line('HB20'), line('i30')] },
  ]

  it('i30 ativo: Hyundai sobe e i30 lidera as linhas', () => {
    const ordered = prioritizeCompatibilityGroupsForVehicle(multi, {
      maker: 'Hyundai',
      model: 'i30',
    })
    expect(ordered[0]?.maker).toBe('Hyundai')
    expect(ordered[0]?.lines[0]?.model).toBe('i30')
    expect(ordered[1]?.maker).toBe('Fiat')
  })

  it('sem veículo: mantém ordem original', () => {
    expect(prioritizeCompatibilityGroupsForVehicle(multi, null)).toEqual(multi)
  })
})
