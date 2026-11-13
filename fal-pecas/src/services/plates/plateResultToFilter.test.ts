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

  it('separa modelo composto legado em modelo + versão/motor', () => {
    const f = plateResultToFilter(
      base({
        maker: 'Renault',
        model: 'Kwid Intens 10MT',
        year: '2020',
        version: null,
        engine: null,
      }),
    )
    expect(f.model).toBe('Kwid')
    expect(f.version).toBe('Intense')
    expect(f.engine).toBe('1.0')
  })

  it('não inclui fuel no VehicleFilter', () => {
    const f = plateResultToFilter(base({ fuel: 'FLEX' }))
    expect(f).not.toHaveProperty('fuel')
    expect(Object.keys(f).sort()).toEqual(['engine', 'maker', 'model', 'version', 'year'].sort())
  })
})
