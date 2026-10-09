import { describe, expect, it } from 'vitest'
import {
  countCompatibilityLines,
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

  it('limiar 4 (card): primeiras 4 linhas; maker só se tiver linha visível', () => {
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
