/**
 * Smoke da inteligência veicular: split → INV → prepare/fan-out.
 * Garante que o pipeline “se prepara” sem colapsar irmãos nem engolir barra.
 */
import { describe, expect, it } from 'vitest'
import { fipeSelectionToIntelligenceRows } from '@/services/admin/fipeCatalogClient'
import { splitApiModelo } from '@/services/plates/splitApiModelo'
import {
  INV_BUILTIN_ALIASES,
  resolveVehicleIdentity,
} from '@/services/vehicles/resolveVehicleIdentity'
import { prepareVehicleMasterIntelligence } from '@/services/vehicles/vehicleMasterIntelligence'
import type { VehicleOptionTree } from '@/types'

const tree: VehicleOptionTree = {
  makers: ['Volkswagen', 'Fiat', 'Hyundai', 'Toyota'],
  modelsByMaker: {
    Volkswagen: ['Gol', 'T-Cross', 'Saveiro'],
    Fiat: ['Argo'],
    Hyundai: ['HB20', 'HB20S'],
    Toyota: ['Corolla', 'Corolla Cross'],
  },
  yearsByModel: {
    'Volkswagen|Gol': ['2018', '2019'],
    'Volkswagen|T-Cross': ['2020'],
    'Volkswagen|Saveiro': ['2019'],
    'Fiat|Argo': ['2020'],
    'Hyundai|HB20': ['2020'],
    'Hyundai|HB20S': ['2021'],
    'Toyota|Corolla': ['2020'],
    'Toyota|Corolla Cross': ['2021'],
  },
  enginesByModel: {
    'Volkswagen|Gol': ['1.0', '2.0'],
    'Volkswagen|T-Cross': ['1.0'],
    'Volkswagen|Saveiro': ['1.6'],
    'Fiat|Argo': ['1.3'],
    'Hyundai|HB20': ['1.0'],
    'Hyundai|HB20S': ['1.0'],
    'Toyota|Corolla': ['2.0'],
    'Toyota|Corolla Cross': ['2.0'],
  },
  enginesByModelYear: {},
  versionsByModel: {
    'Volkswagen|Gol': ['Comfortline', 'Highline'],
    'Volkswagen|T-Cross': ['Sense'],
    'Volkswagen|Saveiro': ['Robust'],
    'Fiat|Argo': ['Drive'],
    'Hyundai|HB20': ['Comfort'],
    'Hyundai|HB20S': ['Diamond'],
    'Toyota|Corolla': ['XEi'],
    'Toyota|Corolla Cross': ['XR'],
  },
}

function inv(partial: Parameters<typeof resolveVehicleIdentity>[0]) {
  return resolveVehicleIdentity({
    ...partial,
    tree,
    aliases: INV_BUILTIN_ALIASES,
  })
}

describe('inteligência veicular smoke', () => {
  it('HB20 1.0 Comfort → HB20 (não ambiguo por HB20S)', () => {
    const r = inv({
      source: 'plate',
      maker: 'Hyundai',
      model: 'HB20 1.0 Comfort',
      year: '2020',
      raw: 'HB20 1.0 Comfort',
    })
    expect(r.filter.model).toBe('HB20')
    expect(r.filter.engine).toBe('1.0')
    expect(r.status).not.toBe('ambiguous')
    expect(r.allowCanonicalUpsert).toBe(false)
  })

  it('Corolla Cross ≠ Corolla', () => {
    const r = inv({
      source: 'text',
      maker: 'Toyota',
      model: 'Corolla Cross',
      year: '2021',
      engine: '2.0',
      version: 'XR',
    })
    expect(r.filter.model).toBe('Corolla Cross')
    expect(r.status).toBe('exact')
  })

  it('T-Cross permanece linha; Saveira→Saveiro', () => {
    expect(
      inv({ source: 'text', maker: 'Volkswagen', model: 'T-CROSS', year: '2020' }).filter
        .model,
    ).toMatch(/T-?Cross/i)
    expect(
      inv({ source: 'text', maker: 'Volkswagen', model: 'Saveira', year: '2019' }).filter
        .model,
    ).toBe('Saveiro')
  })

  it('2.0 16V: motor = cilindrada; válvulas na versão', () => {
    const s = splitApiModelo('Gol 2.0 16V Comfortline')
    expect(s).toEqual({
      model: 'Gol',
      engine: '2.0',
      version: 'Comfortline 16V',
    })
  })

  it('multi FIPE + barra → VVs separadas no prepare', () => {
    const rows = fipeSelectionToIntelligenceRows({
      brandName: 'Volkswagen',
      selections: [
        {
          modelName: 'Gol Comfortline / Highline 1.0',
          years: [{ code: '2018-5', name: '2018 Flex', year: 2018, fuel: 'Flex' }],
        },
        {
          modelName: 'Gol 1.0',
          years: [{ code: '2019-5', name: '2019 Flex', year: 2019, fuel: 'Flex' }],
        },
      ],
    })
    const ok = prepareVehicleMasterIntelligence(rows).prepared.filter(
      (p) => p.action === 'upsert',
    )
    expect(ok.length).toBeGreaterThanOrEqual(3)
    expect(
      ok.filter(
        (p) =>
          p.model === 'Gol' &&
          (p.version === 'Comfortline' || p.version === 'Highline'),
      ),
    ).toHaveLength(2)
  })

  it('lookup nunca permite upsert canônico automático', () => {
    const r = inv({
      source: 'plate',
      maker: 'Fiat',
      model: 'Argo Drive 1.3',
      year: '2020',
    })
    expect(r.allowCanonicalUpsert).toBe(false)
    expect(r.filter.model).toBe('Argo')
    expect(r.filter.engine).toBe('1.3')
    expect(r.filter.version).toBe('Drive')
  })
})
