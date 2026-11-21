import { describe, expect, it } from 'vitest'
import { mergePlateAssistAgainstCatalog } from './interpretPlateAssist'
import {
  assertPlateAgainstCatalog,
  derivePlateConfidenceBand,
  scoreModelMatch,
} from './plateIdentityAssert'
import type { PlateLookupResult } from './plateTypes'
import type { VehicleOptionTree } from '@/types'

const tree: VehicleOptionTree = {
  makers: ['Renault', 'Volkswagen'],
  modelsByMaker: {
    Renault: ['Kwid', 'Kwid Intense', 'Sandero'],
    Volkswagen: ['Gol', 'Polo'],
  },
  yearsByModel: {},
  enginesByModel: {},
  enginesByModelYear: {},
  versionsByModel: {},
}

function base(partial: Partial<PlateLookupResult>): PlateLookupResult {
  return {
    plate: 'ABC1D23',
    status: 'found',
    maker: 'Renault',
    model: 'Kwid',
    year: '2022',
    version: null,
    engine: null,
    fuel: null,
    transmission: null,
    manufacturerId: null,
    modelId: null,
    versionId: null,
    vehicleGroup: null,
    source: 'apiplacas',
    queriedAt: new Date().toISOString(),
    confidence: 0.85,
    message: null,
    candidates: [],
    isMock: false,
    ...partial,
  }
}

describe('scoreModelMatch', () => {
  it('exato / prefixo', () => {
    expect(scoreModelMatch('Kwid', 'Kwid')).toBe(100)
    expect(scoreModelMatch('Kwid Intense', 'Kwid')).toBeGreaterThan(70)
  })
})

describe('assertPlateAgainstCatalog', () => {
  it('promove ambiguous quando há modelos irmãos próximos', () => {
    const out = assertPlateAgainstCatalog(
      base({ model: 'Kwid Intens', confidence: 0.6 }),
      tree,
    )
    expect(out.status).toBe('ambiguous')
    expect(out.candidates.length).toBeGreaterThanOrEqual(2)
    expect(['B', 'C', 'D']).toContain(out.confidenceBand)
    expect(out.identityAsserted).toBe(true)
  })

  it('alinha modelo exato ao cadastro', () => {
    const out = assertPlateAgainstCatalog(base({ model: 'kwid' }), tree)
    expect(out.model).toBe('Kwid')
    expect(out.maker).toBe('Renault')
  })
})

describe('derivePlateConfidenceBand', () => {
  it('respeita edge band e rebaixa se ambíguo', () => {
    expect(
      derivePlateConfidenceBand({
        confidence: 0.9,
        status: 'found',
        ambiguousCount: 0,
        topModelScore: 100,
        edgeBand: 'A',
      }),
    ).toBe('A')
    expect(
      derivePlateConfidenceBand({
        confidence: 0.9,
        status: 'ambiguous',
        ambiguousCount: 2,
        topModelScore: 80,
        edgeBand: 'A',
      }),
    ).toBe('C')
  })
})

describe('mergePlateAssistAgainstCatalog', () => {
  it('só aplica modelo existente no catálogo', () => {
    const catalog = [
      { maker: 'Renault', model: 'Kwid', versions: ['Zen', 'Intense'] },
      { maker: 'Renault', model: 'Sandero', versions: [] },
    ]
    const out = mergePlateAssistAgainstCatalog(
      base({ model: 'KWID ZEN ERRADO' }),
      { maker: 'Renault', model: 'Kwid', version: 'Intense' },
      catalog,
    )
    expect(out.model).toBe('Kwid')
    expect(out.version).toBe('Intense')
    expect(out.identityLlmAssisted).toBe(true)

    const ignored = mergePlateAssistAgainstCatalog(
      base({ model: 'Kwid' }),
      { maker: 'Renault', model: 'InventoXYZ' },
      catalog,
    )
    expect(ignored.model).toBe('Kwid')
    expect(ignored.identityLlmAssisted).toBeFalsy()
  })
})
