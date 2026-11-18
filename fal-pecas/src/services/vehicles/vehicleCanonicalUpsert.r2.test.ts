/**
 * Espelho da regra R2 do Edge `vehicleCanonicalUpsert` (ano obrigatório).
 */
import { describe, expect, it } from 'vitest'

function parseYear(year: string | number | null | undefined): number | null {
  if (year == null || year === '') return null
  const n = typeof year === 'number' ? year : Number(String(year).trim())
  if (!Number.isFinite(n) || n < 1950 || n > 2100) return null
  return Math.trunc(n)
}

function requireYearForCanonicalUpsert(input: {
  maker: string
  model: string
  year?: string | number | null
}): void {
  if (!input.maker?.trim() || !input.model?.trim()) {
    throw new Error('maker_and_model_required')
  }
  if (parseYear(input.year) == null) {
    throw new Error('year_required_for_canonical_upsert')
  }
}

describe('vehicleCanonicalUpsert R2 gate', () => {
  it('bloqueia upsert sem ano', () => {
    expect(() =>
      requireYearForCanonicalUpsert({ maker: 'Chevrolet', model: 'Onix' }),
    ).toThrow('year_required_for_canonical_upsert')
  })

  it('aceita maker+model+ano', () => {
    expect(() =>
      requireYearForCanonicalUpsert({
        maker: 'Chevrolet',
        model: 'Onix',
        year: '2016',
      }),
    ).not.toThrow()
  })
})
