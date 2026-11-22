/**
 * VAL jornada cliente até mosca branca (veículo raro / difícil).
 * Identidade ≠ PVC: mestre rico permite achar; peças exigem PVC depois.
 */
import { describe, expect, it } from 'vitest'
import { assertPlateAgainstCatalog } from '@/services/plates/plateIdentityAssert'
import { reconcileVehicleFilter } from '@/services/plates/reconcileVehicleFilter'
import {
  canOpenConfirmation,
  type PlateLookupResult,
} from '@/services/plates/plateTypes'
import { interpretSearchQuery } from '@/services/search/interpretSearchQuery'
import type { VehicleOptionTree } from '@/types'

const richTree: VehicleOptionTree = {
  makers: ['Fiat', 'Renault', 'Volkswagen', 'Hyundai'],
  modelsByMaker: {
    Fiat: ['Mobi', 'Argo', 'Uno'],
    Renault: ['Kwid', 'Kwid Intense', 'Sandero'],
    Volkswagen: ['Gol', 'Cross Fox'],
    Hyundai: ['HB20'],
  },
  yearsByModel: {
    'Renault|Kwid': ['2018', '2020'],
    'Renault|Kwid Intense': ['2021'],
    'Volkswagen|Cross Fox': ['2007'],
    'Hyundai|HB20': ['2015', '2020'],
  },
  enginesByModel: {
    'Renault|Kwid': ['1.0'],
    'Renault|Kwid Intense': ['1.0'],
    'Volkswagen|Cross Fox': [],
    'Hyundai|HB20': ['1.0'],
  },
  enginesByModelYear: {},
  versionsByModel: {
    'Renault|Kwid': ['Zen', 'Life'],
    'Renault|Kwid Intense': ['Intense'],
    'Hyundai|HB20': ['Unique'],
  },
  productionByModel: {
    'Renault|Kwid': { start: 2017, end: 2024 },
    'Renault|Kwid Intense': { start: 2019, end: 2024 },
    'Volkswagen|Cross Fox': { start: 2005, end: 2009 },
  },
}

function plate(partial: Partial<PlateLookupResult>): PlateLookupResult {
  return {
    plate: 'ABC1D23',
    status: 'found',
    maker: 'Renault',
    model: 'Kwid',
    year: '2021',
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
    confidence: 0.8,
    message: null,
    candidates: [],
    isMock: false,
    ...partial,
  }
}

describe('jornada mosca branca', () => {
  it('T1 — modelo fora do mestre: assert deixa conferência possível mas banda baixa', () => {
    const out = assertPlateAgainstCatalog(
      plate({ maker: 'Troller', model: 'T4', year: '2012', confidence: 0.5 }),
      richTree,
    )
    expect(out.identityAsserted).toBe(true)
    // Sem Troller no mestre → não alinha para score alto; faixa tende C/D
    expect(['B', 'C', 'D']).toContain(out.confidenceBand)
    expect(canOpenConfirmation(out) || out.status === 'incomplete' || out.status === 'not_in_catalog' || out.status === 'found').toBe(
      true,
    )
  })

  it('T2 — VV thin (Cross Fox 2007): motor/versão inventados → Não informado', () => {
    const r = reconcileVehicleFilter(
      {
        maker: 'Volkswagen',
        model: 'Crossfox',
        year: '2007',
        engine: 'Inventado 2.0',
        version: 'Fake',
      },
      richTree,
    )
    expect(r.model).toBe('Cross Fox')
    expect(r.year).toBe('2007')
    // Sem match no mestre → Não informado ("")
    expect(r.engine).toBe('')
    expect(r.version).toBe('')
  })

  it('T3 — NL sem modelo raro no catálogo não inventa veículo', () => {
    const catalog = [
      { maker: 'Fiat', model: 'Mobi', versions: [] },
      { maker: 'Renault', model: 'Kwid', versions: ['Zen'] },
    ]
    const intent = interpretSearchQuery('filtro ar Troller T4 2012', catalog)
    expect(intent.vehicle?.model ?? null).toBeFalsy()
  })

  it('T3c — merge LLM mosca branca também não inventa (Troller)', async () => {
    const { mergeSearchIntent } = await import('@/services/search/interpretNaturalLanguage')
    const catalog = [
      { maker: 'Fiat', model: 'Mobi', versions: [] },
      { maker: 'Renault', model: 'Kwid', versions: [] },
    ]
    const merged = mergeSearchIntent(
      {
        raw: 'filtro ar Troller T4 2012',
        productQuery: 'filtro ar',
        vehicle: {},
        needsClarification: false,
        confidence: 'low',
      },
      {
        productQuery: 'filtro ar',
        vehicle: { maker: 'Troller', model: 'T4', year: '2012' },
        confidence: 'high',
      },
      catalog,
    )
    expect(merged.vehicle.model).toBeUndefined()
    expect(merged.vehicle.maker).toBeUndefined()
  })

  it('T3b — NL com modelo no catálogo interpreta veículo', () => {
    const catalog = [
      { maker: 'Hyundai', model: 'HB20', versions: ['Unique'] },
      { maker: 'Renault', model: 'Kwid', versions: [] },
    ]
    const intent = interpretSearchQuery('pastilha HB20 2015', catalog)
    expect(intent.vehicle?.model).toBeTruthy()
  })

  it('T4 — família ambígua Kwid × Intense exige candidatos', () => {
    const out = assertPlateAgainstCatalog(
      plate({ model: 'Kwid Intens', year: '2021', confidence: 0.55 }),
      richTree,
    )
    expect(out.status).toBe('ambiguous')
    expect(out.candidates.length).toBeGreaterThanOrEqual(2)
    expect(canOpenConfirmation(out)).toBe(true)
  })

  it('T5 — exact win Intense sobrevive (cliente não vira mosca por colapso)', () => {
    const r = reconcileVehicleFilter(
      { maker: 'Renault', model: 'Kwid Intense', year: '2021', engine: '1.0' },
      richTree,
    )
    expect(r.model).toBe('Kwid Intense')
  })

  it('T6 — ano fora da vida de linha rebaixa confiança', () => {
    const out = assertPlateAgainstCatalog(
      plate({
        maker: 'Volkswagen',
        model: 'Cross Fox',
        year: '2018',
        confidence: 0.95,
        confidenceBand: 'A',
      }),
      richTree,
    )
    expect(out.confidenceBand).not.toBe('A')
    expect(out.message ?? '').toMatch(/vida de linha|fora/i)
  })

  it('T7 — dual year fab≠modelo: usa ano-modelo e rebaixa A→B', () => {
    const out = assertPlateAgainstCatalog(
      plate({
        maker: 'Hyundai',
        model: 'HB20',
        year: '2020',
        yearModel: '2020',
        yearFabrication: '2019',
        confidence: 0.95,
        confidenceBand: 'A',
      }),
      richTree,
    )
    expect(out.year).toBe('2020')
    expect(out.yearModel).toBe('2020')
    expect(out.yearFabrication).toBe('2019')
    expect(out.confidenceBand).toBe('B')
    expect(out.message ?? '').toMatch(/fabricação|ano-modelo/i)
  })

  it('T8 — pós-pick de candidato: re-assert foca no modelo escolhido', () => {
    const ambiguous = assertPlateAgainstCatalog(
      plate({ model: 'Kwid Intens', year: '2021', confidence: 0.55 }),
      richTree,
    )
    expect(ambiguous.status).toBe('ambiguous')
    const pick = ambiguous.candidates.find((c) => c.model === 'Kwid Intense')
    expect(pick?.model).toBe('Kwid Intense')
    const after = assertPlateAgainstCatalog(
      plate({
        ...ambiguous,
        maker: pick!.maker,
        model: pick!.model,
        year: pick!.year ?? '2021',
        status: 'found',
        candidates: [],
        confidence: 0.8,
        confidenceBand: null,
      }),
      richTree,
    )
    expect(after.model).toBe('Kwid Intense')
    expect(after.status).not.toBe('ambiguous')
    expect(after.identityAsserted).toBe(true)
  })
})
