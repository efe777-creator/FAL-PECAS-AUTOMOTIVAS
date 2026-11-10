import { describe, expect, it } from 'vitest'
import { plateResultToFilter, type PlateLookupResult } from './plateTypes'

function base(partial: Partial<PlateLookupResult>): PlateLookupResult {
  return {
    plate: 'INT8C36',
    status: 'found',
    maker: 'Volkswagen',
    model: 'Cross Fox',
    year: '2007',
    version: null,
    engine: null,
    fuel: null,
    transmission: null,
    manufacturerId: 'm1',
    modelId: 'md1',
    versionId: 'v1',
    vehicleGroup: null,
    source: 'apiplacas',
    queriedAt: new Date().toISOString(),
    confidence: 1,
    message: null,
    candidates: [],
    isMock: false,
    ...partial,
  }
}

describe('plateResultToFilter', () => {
  it('preenche motor/versão vazios como Não informado ("")', () => {
    const f = plateResultToFilter(base({}))
    expect(f.maker).toBe('Volkswagen')
    expect(f.model).toBe('Cross Fox')
    expect(f.year).toBe('2007')
    expect(f.engine).toBe('')
    expect(f.version).toBe('')
  })
})
