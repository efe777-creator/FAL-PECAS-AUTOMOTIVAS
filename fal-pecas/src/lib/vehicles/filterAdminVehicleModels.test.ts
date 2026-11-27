import { describe, expect, it } from 'vitest'
import { filterAdminVehicleModels } from './filterAdminVehicleModels'
import type { VehicleModel, VehicleVersion } from '@/types'

function model(partial: Partial<VehicleModel> & { id: string; name: string }): VehicleModel {
  return {
    manufacturerId: 'm1',
    slug: partial.name.toLowerCase(),
    status: 'active',
    qualityStatus: 'verified',
    vehicleClass: 'car',
    ...partial,
  }
}

function vv(
  partial: Partial<VehicleVersion> & { id: string; modelId: string },
): VehicleVersion {
  return {
    manufacturerId: 'm1',
    year: 2020,
    engine: null,
    versionName: null,
    fuel: null,
    transmission: null,
    transmissionDetail: null,
    traction: null,
    tractionDetail: null,
    bodyConfiguration: null,
    vehicleClass: null,
    source: 'admin',
    status: 'active',
    ...partial,
  }
}

describe('filterAdminVehicleModels', () => {
  const models = [
    model({ id: 'strada', name: 'Strada', manufacturerId: 'fiat', vehicleClass: 'light_utility' }),
    model({ id: 'saveiro', name: 'Saveiro', manufacturerId: 'vw', vehicleClass: 'light_utility' }),
    model({ id: 'corsa', name: 'Corsa', manufacturerId: 'gm', vehicleClass: 'car' }),
  ]
  const makers = new Map([
    ['fiat', 'Fiat'],
    ['vw', 'Volkswagen'],
    ['gm', 'Chevrolet'],
  ])
  const versions = new Map<string, VehicleVersion[]>([
    ['strada', [vv({ id: 's1', modelId: 'strada', year: 2018 })]],
    ['saveiro', [vv({ id: 'v1', modelId: 'saveiro', year: 2019 })]],
    [
      'corsa',
      [
        vv({ id: 'c1', modelId: 'corsa', year: 2005, versionName: 'HATCH' }),
        vv({
          id: 'c2',
          modelId: 'corsa',
          year: 2005,
          versionName: 'SEDAN',
          transmission: 'manual',
        }),
      ],
    ],
  ])

  it('filtro vazio devolve todos', () => {
    expect(filterAdminVehicleModels(models, versions, makers, {})).toHaveLength(3)
  })

  it('montadora restringe', () => {
    const list = filterAdminVehicleModels(models, versions, makers, { makerId: 'fiat' })
    expect(list.map((m) => m.name)).toEqual(['Strada'])
  })

  it('classe light_utility: Strada e Saveiro, não Corsa', () => {
    const list = filterAdminVehicleModels(models, versions, makers, {
      vehicleClass: 'light_utility',
    })
    expect(list.map((m) => m.name).sort()).toEqual(['Saveiro', 'Strada'])
  })

  it('Fiat + light_utility não traz Saveiro', () => {
    const list = filterAdminVehicleModels(models, versions, makers, {
      makerId: 'fiat',
      vehicleClass: 'light_utility',
    })
    expect(list.map((m) => m.name)).toEqual(['Strada'])
  })

  it('transmissão Manual não inclui NULL', () => {
    const list = filterAdminVehicleModels(models, versions, makers, {
      transmission: 'manual',
    })
    expect(list.map((m) => m.name)).toEqual(['Corsa'])
  })

  it('busca textual hatch acha Corsa pelo version_name', () => {
    const list = filterAdminVehicleModels(models, versions, makers, {
      searchName: 'hatch',
    })
    expect(list.map((m) => m.name)).toEqual(['Corsa'])
  })

  it('modelo entra se uma versão casa', () => {
    const list = filterAdminVehicleModels(models, versions, makers, {
      year: '2005',
      transmission: 'manual',
    })
    expect(list.map((m) => m.name)).toEqual(['Corsa'])
  })
})
