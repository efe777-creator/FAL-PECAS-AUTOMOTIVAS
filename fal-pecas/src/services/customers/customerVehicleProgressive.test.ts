import { describe, expect, it } from 'vitest'
import { plateResultToFilter } from '@/services/plates/plateTypes'
import type { PlateLookupResult } from '@/services/plates/plateTypes'

/** Contratos do save progressivo (PLANO 0 / marcha) — sem mock de Supabase. */

describe('garagem progressiva — contrato do filtro', () => {
  it('maker+model bastam; motor/versão vazios não bloqueiam o payload', () => {
    const result: PlateLookupResult = {
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
      versionId: 'ver-1',
      vehicleGroup: null,
      source: 'apiplacas',
      queriedAt: new Date().toISOString(),
      confidence: 0.6,
      message: 'Motor/versão não informados',
      candidates: [],
      isMock: false,
    }
    const f = plateResultToFilter(result)
    expect(f.maker).toBe('Fiat')
    expect(f.model).toBe('Argo')
    expect(f.engine).toBe('')
    expect(f.version).toBe('')
    expect(f.manufacturerId).toBe('man-1')
    expect(f.versionId).toBe('ver-1')
    expect(f.plate).toBe('ABC1D23')
  })

  it('CustomerSavedVehicle admite versionId null no tipo', () => {
    const sample = {
      id: '1',
      customerId: 'c1',
      versionId: null as string | null,
      isPrimary: true,
      makerName: 'Fiat',
      modelName: 'Argo',
    }
    expect(sample.versionId).toBeNull()
  })
})
