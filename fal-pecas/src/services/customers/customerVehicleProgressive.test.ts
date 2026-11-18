import { describe, expect, it } from 'vitest'
import { plateResultToFilter } from '@/services/plates/plateTypes'
import type { PlateLookupResult } from '@/services/plates/plateTypes'
import type { CustomerSavedVehicle } from '@/types'

/** Contratos do save progressivo (PLANO 0 §12) — sem mock de Supabase. */

function baseResult(over: Partial<PlateLookupResult> = {}): PlateLookupResult {
  return {
    plate: 'ABC1D23',
    status: 'incomplete',
    maker: 'Fiat',
    model: 'Argo',
    year: '2020',
    version: null,
    engine: null,
    fuel: null,
    transmission: null,
    manufacturerId: 'man-1',
    modelId: 'mod-1',
    versionId: null,
    vehicleGroup: null,
    source: 'apiplacas',
    queriedAt: new Date().toISOString(),
    confidence: 0.6,
    message: null,
    candidates: [],
    isMock: false,
    ...over,
  }
}

describe('garagem progressiva — contrato do filtro (§12)', () => {
  it('#2/#3 sem versão e sem motor: maker+model bastam no payload', () => {
    const f = plateResultToFilter(baseResult({ version: null, engine: null }))
    expect(f.maker).toBe('Fiat')
    expect(f.model).toBe('Argo')
    expect(f.engine).toBe('')
    expect(f.version).toBe('')
    expect(f.plate).toBe('ABC1D23')
  })

  it('#4 dados parciais: ano sem motor/versão', () => {
    const f = plateResultToFilter(baseResult({ year: '2016', engine: null, version: null }))
    expect(f.year).toBe('2016')
    expect(f.engine).toBe('')
    expect(f.version).toBe('')
  })

  it('#1 placa completa propaga IDs canônicos', () => {
    const f = plateResultToFilter(
      baseResult({
        status: 'found',
        version: 'LT',
        engine: '1.4',
        manufacturerId: 'man-1',
        modelId: 'mod-1',
        versionId: 'ver-1',
      }),
    )
    expect(f.version).toBe('LT')
    expect(f.engine).toBe('1.4')
    expect(f.manufacturerId).toBe('man-1')
    expect(f.modelId).toBe('mod-1')
    expect(f.versionId).toBe('ver-1')
  })

  it('#8 não mapeado: preserva brutos quando normalização falha', () => {
    const f = plateResultToFilter(
      baseResult({
        engine: null,
        version: null,
        engineRaw: '0.1',
        versionRaw: '1.6 A',
      }),
    )
    expect(f.engine).toBe('')
    expect(f.version).toBe('')
    expect(f.engineRaw).toBe('0.1')
    expect(f.versionRaw).toBe('1.6 A')
  })

  it('#9/#10 incompleto sem versionId aparece na listagem tipada', () => {
    const sample: CustomerSavedVehicle = {
      id: '1',
      customerId: 'c1',
      manufacturerId: null,
      modelId: null,
      versionId: null,
      year: 2016,
      engine: null,
      nickname: null,
      isPrimary: true,
      plate: 'GAF7032',
      makerName: 'Chevrolet',
      modelName: 'Onix',
      versionName: null,
    }
    expect(sample.versionId).toBeNull()
    expect(sample.makerName).toBe('Chevrolet')
    expect(sample.modelName).toBe('Onix')
    const label = [sample.makerName, sample.modelName, sample.year, sample.engine, sample.versionName]
      .filter(Boolean)
      .join(' · ')
    expect(label).toBe('Chevrolet · Onix · 2016')
  })
})
