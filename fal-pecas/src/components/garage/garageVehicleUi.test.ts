import { describe, expect, it } from 'vitest'
import type { CustomerSavedVehicle } from '@/types'
import {
  isVehicleIncomplete,
  matchSavedVehicleForFilter,
  vehicleCatalogHref,
  vehicleDisplayName,
  vehiclePlateLabel,
  vehicleTechLine,
} from './garageVehicleUi'

const base: CustomerSavedVehicle = {
  id: '1',
  customerId: 'c1',
  isPrimary: true,
  makerName: 'Chevrolet',
  modelName: 'Onix',
  year: 2020,
  engine: '1.0',
  versionName: 'LT',
  versionId: 'vv1',
  plate: 'gaf-7032',
  nickname: 'Onix da firma',
}

describe('garageVehicleUi (#9 helpers)', () => {
  it('prioriza apelido no nome de exibição', () => {
    expect(vehicleDisplayName(base)).toBe('Onix da firma')
    expect(vehicleDisplayName({ ...base, nickname: null })).toBe('Chevrolet Onix')
  })

  it('monta linha técnica e href do catálogo', () => {
    expect(vehicleTechLine(base)).toContain('Chevrolet')
    expect(vehicleTechLine(base)).toContain('2020')
    const href = vehicleCatalogHref(base)
    expect(href).toContain('/catalogo?')
    expect(href).toContain('maker=Chevrolet')
    expect(href).toContain('model=Onix')
    expect(href).toContain('year=2020')
  })

  it('placa formatada e incomplete sem versionId', () => {
    expect(vehiclePlateLabel(base)).toBeTruthy()
    expect(isVehicleIncomplete(base)).toBe(false)
    expect(isVehicleIncomplete({ ...base, versionId: null })).toBe(true)
  })

  it('casa filtro de placa com veículo salvo (evita ativo errado)', () => {
    const palio: CustomerSavedVehicle = {
      id: '2',
      customerId: 'c1',
      isPrimary: false,
      makerName: 'Fiat',
      modelName: 'Palio',
      year: 2012,
    }
    const hit = matchSavedVehicleForFilter([palio, base], {
      maker: 'Chevrolet',
      model: 'Onix',
      plate: 'GAF7032',
    })
    expect(hit?.id).toBe('1')
    expect(
      matchSavedVehicleForFilter([palio], { maker: 'Chevrolet', model: 'Onix' }),
    ).toBeNull()
  })
})
