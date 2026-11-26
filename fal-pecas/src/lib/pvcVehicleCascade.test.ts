import { describe, expect, it } from 'vitest'
import {
  PVC_CASCADE_HINT,
  pvcEngineOptions,
  pvcMatchingVersions,
  pvcVersionNameOptions,
} from '@/lib/pvcVehicleCascade'
import type { VehicleVersion } from '@/types'

function v(
  partial: Partial<VehicleVersion> & { id: string },
): VehicleVersion {
  return {
    id: partial.id,
    manufacturerId: partial.manufacturerId ?? 'mk1',
    modelId: partial.modelId ?? 'm1',
    engine: partial.engine ?? null,
    versionName: partial.versionName ?? null,
    year: partial.year ?? null,
    fuel: partial.fuel ?? null,
    status: partial.status ?? 'active',
  }
}

describe('pvcVehicleCascade', () => {
  const versions = [
    v({ id: '1', engine: '1.0', versionName: 'Unique' }),
    v({ id: '2', engine: '1.0', versionName: 'Way' }),
    v({ id: '3', engine: '1.4', versionName: 'ELX' }),
    v({ id: '4', engine: '', versionName: 'Base' }),
  ]

  it('lista motorizações distintas ordenadas', () => {
    expect(pvcEngineOptions(versions)).toEqual(['1.0', '1.4'])
  })

  it('filtra nomes de versão por motor', () => {
    expect(pvcVersionNameOptions(versions, '1.0')).toEqual(['Unique', 'Way'])
    expect(pvcVersionNameOptions(versions, '')).toEqual(['Base', 'ELX', 'Unique', 'Way'])
  })

  it('matching: vazio = todas; filtros afinam', () => {
    expect(pvcMatchingVersions(versions, '', '').map((x) => x.id)).toEqual([
      '1',
      '2',
      '3',
      '4',
    ])
    expect(pvcMatchingVersions(versions, '1.0', '').map((x) => x.id)).toEqual(['1', '2'])
    expect(pvcMatchingVersions(versions, '1.0', 'Way').map((x) => x.id)).toEqual(['2'])
  })

  it('exporta hint de coringa compartilhado', () => {
    expect(PVC_CASCADE_HINT).toMatch(/Cascata: montadora/)
    expect(PVC_CASCADE_HINT).toMatch(/serve para todas/)
  })
})
