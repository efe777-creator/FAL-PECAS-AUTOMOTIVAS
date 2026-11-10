import { allowCatalogMocks } from '@/lib/storeBackend'
import { getSupabase, isSupabaseConfigured } from '@/lib/supabase'
import { lookupMockPlate } from '@/services/plates/mockPlateFixtures'
import {
  isValidPlate,
  normalizePlate,
  plateValidationMessage,
} from '@/services/plates/plateNormalize'
import type { PlateLookupResult } from '@/services/plates/plateTypes'

function asResult(data: unknown): PlateLookupResult | null {
  if (!data || typeof data !== 'object') return null
  const r = data as PlateLookupResult
  if (!r.plate || !r.status) return null
  return r
}

/**
 * Consulta placa via Edge `plate-lookup`.
 * Em DEV com mocks liberados, usa fixtures locais se a Edge falhar / não estiver disponível.
 */
export async function lookupPlate(rawPlate: string): Promise<PlateLookupResult> {
  const validation = plateValidationMessage(rawPlate)
  const plate = normalizePlate(rawPlate)

  if (validation || !isValidPlate(plate)) {
    return {
      plate,
      status: 'invalid_plate',
      maker: null,
      model: null,
      year: null,
      version: null,
      engine: null,
      fuel: null,
      transmission: null,
      manufacturerId: null,
      modelId: null,
      versionId: null,
      vehicleGroup: null,
      source: 'mock',
      queriedAt: new Date().toISOString(),
      confidence: null,
      message: validation ?? 'Formato inválido.',
      candidates: [],
      isMock: true,
    }
  }

  if (isSupabaseConfigured) {
    try {
      const { data, error } = await getSupabase().functions.invoke('plate-lookup', {
        body: { plate },
      })
      if (!error) {
        const parsed = asResult(data)
        if (parsed) return parsed
      }
      console.warn('[plateLookup] Edge falhou, avaliando fallback mock', error)
    } catch (err) {
      console.warn('[plateLookup] Edge indisponível', err)
    }
  }

  // Fallback mock só em DEV com flag explícita — produção depende da Edge.
  if (allowCatalogMocks()) {
    return lookupMockPlate(plate)
  }

  return {
    plate,
    status: 'unavailable',
    maker: null,
    model: null,
    year: null,
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
    confidence: null,
    message: 'Consulta temporariamente indisponível. Selecione o veículo manualmente.',
    candidates: [],
    isMock: false,
  }
}
