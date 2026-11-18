/**
 * R5 — cobertura unitária da matriz PLANO 0 §12 (camada Vitest).
 * Casos e2e-only ficam documentados no VAL / residuals.
 */
import { beforeEach, describe, expect, it } from 'vitest'
import {
  canOpenConfirmation,
  plateResultToFilter,
  requiresManualSelection,
  type PlateLookupResult,
} from './plateTypes'
import { lookupMockPlate } from './mockPlateFixtures'
import {
  clearPendingGarageVehicle,
  readPendingGarageVehicle,
  savePendingGarageVehicle,
} from './pendingGarage'
import { isVehicleIncomplete } from '@/components/garage/garageVehicleUi'
import type { CustomerSavedVehicle } from '@/types'
import { buildPlateSourceSnapshot } from './plateSourceSnapshot'

function baseResult(partial: Partial<PlateLookupResult>): PlateLookupResult {
  return {
    plate: 'GAF7032',
    status: 'found',
    maker: 'Chevrolet',
    model: 'Onix',
    year: '2016',
    version: 'LT',
    engine: '1.4',
    fuel: 'FLEX',
    transmission: 'Manual',
    manufacturerId: null,
    modelId: null,
    versionId: null,
    vehicleGroup: null,
    source: 'apiplacas',
    queriedAt: '2026-11-18T00:00:00.000Z',
    confidence: 0.9,
    message: null,
    candidates: [],
    isMock: false,
    ...partial,
  }
}

const memory = new Map<string, string>()

describe('PLANO 0 §12 unit (R5)', () => {
  beforeEach(() => {
    memory.clear()
    Object.defineProperty(globalThis, 'sessionStorage', {
      configurable: true,
      value: {
        getItem: (k: string) => memory.get(k) ?? null,
        setItem: (k: string, v: string) => {
          memory.set(k, v)
        },
        removeItem: (k: string) => {
          memory.delete(k)
        },
      },
    })
    clearPendingGarageVehicle()
  })

  it('#1 placa completa → filter com 5 eixos', () => {
    const f = plateResultToFilter(baseResult({}))
    expect(f.maker).toBe('Chevrolet')
    expect(f.model).toBe('Onix')
    expect(f.year).toBe('2016')
    expect(f.engine).toBe('1.4')
    expect(f.version).toBe('LT')
  })

  it('#2 sem versão → Não informado no filtro', () => {
    const f = plateResultToFilter(baseResult({ version: null }))
    expect(f.version).toBe('')
  })

  it('#3 sem motor → Não informado + bruto no snapshot', () => {
    const f = plateResultToFilter(
      baseResult({ engine: null, engineRaw: '0.1', version: 'LT' }),
    )
    expect(f.engine).toBe('')
    expect(f.engineRaw).toBe('0.1')
    expect(f.sourceSnapshot?.engineRaw).toBe('0.1')
  })

  it('#4 dados parciais / incomplete ainda abre confirmação', () => {
    const r = baseResult({ status: 'incomplete', year: null, engine: null, version: null })
    expect(canOpenConfirmation(r)).toBe(true)
    const f = plateResultToFilter(r)
    expect(f.maker).toBe('Chevrolet')
    expect(f.model).toBe('Onix')
  })

  it('#5 API indisponível → manual (não abre confirmação de found)', () => {
    expect(requiresManualSelection('unavailable')).toBe(true)
    expect(requiresManualSelection('invalid_plate')).toBe(true)
    expect(canOpenConfirmation(baseResult({ status: 'unavailable', maker: null, model: null }))).toBe(
      false,
    )
    expect(lookupMockPlate('DWN0T00').status).toBe('unavailable')
  })

  it('#7 ambíguo exige escolha (candidates)', () => {
    const amb = lookupMockPlate('AMB1G00')
    expect(amb.status).toBe('ambiguous')
    expect(canOpenConfirmation(amb)).toBe(true)
    expect(amb.candidates.length).toBeGreaterThan(0)
  })

  it('#10 listagem incompletos = sem versionId', () => {
    const incomplete: CustomerSavedVehicle = {
      id: 'v1',
      customerId: 'c1',
      isPrimary: true,
      makerName: 'Fiat',
      modelName: 'Argo',
      versionId: null,
    }
    const complete = { ...incomplete, versionId: 'vv1' }
    expect(isVehicleIncomplete(incomplete)).toBe(true)
    expect(isVehicleIncomplete(complete)).toBe(false)
  })

  it('#12 pending pós-login preserva snapshot (recuperação)', () => {
    const snap = buildPlateSourceSnapshot({
      plate: 'GAF7032',
      maker: 'Chevrolet',
      model: 'Onix',
      year: '2016',
      fuel: 'FLEX',
      transmission: 'Manual',
      source: 'apiplacas',
    })
    savePendingGarageVehicle({
      maker: 'Chevrolet',
      model: 'Onix',
      year: '2016',
      sourceSnapshot: snap,
      returnTo: '/catalogo?vehicle=1',
    })
    const pending = readPendingGarageVehicle()
    expect(pending?.sourceSnapshot?.fuel).toBe('FLEX')
    expect(pending?.returnTo).toContain('/catalogo')
  })

  it('#16 fuel/câmbio no snapshot NÃO viram chaves de filtro PVC', () => {
    const f = plateResultToFilter(baseResult({ fuel: 'FLEX', transmission: 'AT' }))
    expect(f).not.toHaveProperty('fuel')
    expect(f).not.toHaveProperty('transmission')
    expect(f.sourceSnapshot?.fuel).toBe('FLEX')
    expect(f.sourceSnapshot?.transmission).toBe('AT')
  })

  it('#14/#15 sanitização: modelo composto separado; bruto preservado', () => {
    const f = plateResultToFilter(
      baseResult({
        model: 'Onix 1.0 LT',
        engine: null,
        version: null,
        engineRaw: null,
        versionRaw: null,
      }),
    )
    expect(f.model).toBe('Onix')
    expect(f.engine === '1.0' || f.engine === '').toBe(true)
  })
})
