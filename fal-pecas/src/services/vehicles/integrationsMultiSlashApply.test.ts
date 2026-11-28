import { describe, expect, it, vi, beforeEach } from 'vitest'
import { fipeSelectionToIntelligenceRows } from '@/services/admin/fipeCatalogClient'
import { prepareVehicleMasterIntelligence } from '@/services/vehicles/vehicleMasterIntelligence'
import {
  diffVehicleMasterCandidates,
  type MasterCatalogSnapshot,
} from '@/services/vehicles/diffVehicleMasterCandidates'
import { applySelectedMasterCandidates } from '@/services/vehicles/vehicleMasterConsultService'

vi.mock('@/services/vehicles/vehicleCanonicalUpsert', () => ({
  vehicleCanonicalUpsert: vi.fn(
    async (input: {
      maker: string
      model: string
      year: number
      version: string | null
      engine: string | null
    }) => ({
      modelId: `m-${input.model}`,
      versionId: `v-${input.version ?? 'x'}-${input.year}`,
      manufacturerId: 'mk',
    }),
  ),
}))

vi.mock('@/services/admin/adminVehicleService', async (importOriginal) => {
  const mod = await importOriginal<typeof import('@/services/admin/adminVehicleService')>()
  return {
    ...mod,
    mergeModelProductionYears: vi.fn(async () => ({
      productionYearStart: 2018,
      productionYearEnd: 2019,
    })),
    adminListModels: vi.fn(async () => []),
    adminListVersions: vi.fn(async () => []),
  }
})

vi.mock('@/services/admin/adminManufacturerService', () => ({
  adminListManufacturers: vi.fn(async () => []),
}))

import { vehicleCanonicalUpsert } from '@/services/vehicles/vehicleCanonicalUpsert'

describe('integracoes → consultar multi + barra → apply', () => {
  beforeEach(() => {
    vi.mocked(vehicleCanonicalUpsert).mockClear()
  })

  it('2 modelos FIPE + Comfortline/Highline → prévia separada e apply sem barra colada', async () => {
    const empty: MasterCatalogSnapshot = { models: [], versions: [] }
    const rows = fipeSelectionToIntelligenceRows({
      brandName: 'Volkswagen',
      selections: [
        {
          modelName: 'Gol Comfortline / Highline 1.0',
          years: [
            { code: '2018-5', name: '2018 Flex', year: 2018, fuel: 'Flex' },
            { code: '2019-5', name: '2019 Flex', year: 2019, fuel: 'Flex' },
          ],
        },
        {
          modelName: 'Polo Highline 1.0',
          years: [{ code: '2020-5', name: '2020 Flex', year: 2020, fuel: 'Flex' }],
        },
      ],
    })
    const prepared = prepareVehicleMasterIntelligence(rows).prepared.filter(
      (p) => p.action === 'upsert',
    )
    const preview = diffVehicleMasterCandidates(prepared, empty)
    expect(preview).toHaveLength(3)
    expect(preview.every((c) => !c.version.includes('/'))).toBe(true)
    expect(preview.map((c) => `${c.model}|${c.version}`).sort()).toEqual([
      'Gol|Comfortline',
      'Gol|Highline',
      'Polo|Highline',
    ])
    expect(preview.every((c) => c.selected)).toBe(true)

    const result = await applySelectedMasterCandidates(preview)
    expect(result.errors).toBe(0)
    const calls = vi.mocked(vehicleCanonicalUpsert).mock.calls.map((c) => c[0])
    const golVersions = new Set(calls.filter((c) => c.model === 'Gol').map((c) => c.version))
    expect(golVersions.has('Comfortline')).toBe(true)
    expect(golVersions.has('Highline')).toBe(true)
    expect([...golVersions].some((v) => v && String(v).includes('/'))).toBe(false)
    expect(calls.some((c) => c.model === 'Polo' && c.version === 'Highline')).toBe(true)
  })
})
