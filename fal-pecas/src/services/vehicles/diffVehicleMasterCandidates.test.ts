import { describe, expect, it } from 'vitest'
import {
  diffVehicleMasterCandidates,
  selectedMasterDiffCandidates,
  type MasterCatalogSnapshot,
} from './diffVehicleMasterCandidates'
import type { MasterIntelligencePrepared } from './vehicleMasterIntelligence'

function prepared(
  partial: Partial<MasterIntelligencePrepared> &
    Pick<MasterIntelligencePrepared, 'maker' | 'model' | 'year'>,
): MasterIntelligencePrepared {
  return {
    engine: null,
    version: null,
    fuel: null,
    productionYearStart: partial.year,
    productionYearEnd: partial.year,
    key: 'k',
    action: 'upsert',
    ...partial,
  }
}

const emptyCatalog: MasterCatalogSnapshot = { models: [], versions: [] }

describe('diffVehicleMasterCandidates', () => {
  it('marca novo quando modelo não existe', () => {
    const rows = diffVehicleMasterCandidates(
      [prepared({ maker: 'Fiat', model: 'Argo', year: 2020, fuel: 'Flex' })],
      emptyCatalog,
    )
    expect(rows).toHaveLength(1)
    expect(rows[0]!.status).toBe('novo')
    expect(rows[0]!.selected).toBe(true)
  })

  it('marca ja_cadastrado quando VV idêntica existe', () => {
    const catalog: MasterCatalogSnapshot = {
      models: [
        {
          id: 'm1',
          manufacturerId: 'mk1',
          makerName: 'Fiat',
          name: 'Argo',
          productionYearStart: 2018,
          productionYearEnd: 2024,
          activeVersionCount: 1,
        },
      ],
      versions: [
        {
          id: 'v1',
          modelId: 'm1',
          manufacturerId: 'mk1',
          year: 2020,
          engine: '1.0',
          versionName: 'Drive',
          fuel: 'Flex',
          status: 'active',
        },
      ],
    }
    const rows = diffVehicleMasterCandidates(
      [
        prepared({
          maker: 'Fiat',
          model: 'Argo',
          year: 2020,
          engine: '1.0',
          version: 'Drive',
          fuel: 'Flex',
          productionYearStart: 2018,
          productionYearEnd: 2024,
        }),
      ],
      catalog,
    )
    expect(rows[0]!.status).toBe('ja_cadastrado')
    expect(rows[0]!.selected).toBe(false)
  })

  it('enriquece quando casca (0 VV)', () => {
    const catalog: MasterCatalogSnapshot = {
      models: [
        {
          id: 'm1',
          manufacturerId: 'mk1',
          makerName: 'Toyota',
          name: 'Corolla Cross',
          productionYearStart: 2021,
          productionYearEnd: 2021,
          activeVersionCount: 0,
        },
      ],
      versions: [],
    }
    const rows = diffVehicleMasterCandidates(
      [prepared({ maker: 'Toyota', model: 'Corolla Cross', year: 2021, fuel: 'Flex' })],
      catalog,
    )
    expect(rows[0]!.status).toBe('enriquece')
    expect(rows[0]!.selected).toBe(true)
  })

  it('selectedMasterDiffCandidates ignora desmarcados', () => {
    const rows = diffVehicleMasterCandidates(
      [
        prepared({ maker: 'A', model: 'B', year: 2020 }),
        prepared({ maker: 'C', model: 'D', year: 2021 }),
      ],
      emptyCatalog,
    )
    rows[0]!.selected = false
    rows[1]!.maker = 'Editado'
    const sel = selectedMasterDiffCandidates(rows)
    expect(sel).toHaveLength(1)
    expect(sel[0]!.maker).toBe('Editado')
  })
})
