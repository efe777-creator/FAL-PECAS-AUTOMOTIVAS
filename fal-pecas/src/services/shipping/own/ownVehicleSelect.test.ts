import { describe, expect, it } from 'vitest'
import type { OwnProductLogisticProfile } from './ownPol'
import { selectOwnVehicle, type OwnVehicleCategory, type OwnVehicleTariff } from './ownVehicleSelect'

const categories: OwnVehicleCategory[] = [
  { id: 'm', code: 'motorcycle', label: 'Moto', capacityPol: 12, sortOrder: 10, active: true },
  { id: 'c', code: 'car', label: 'Carro', capacityPol: 48, sortOrder: 20, active: true },
]

const tariffs: OwnVehicleTariff[] = [
  { categoryId: 'm', tarifaMinima: 20, valorPorKm: 2, active: true, version: 1 },
  { categoryId: 'c', tarifaMinima: 40, valorPorKm: 3, active: true, version: 1 },
]

function p(partial: Partial<OwnProductLogisticProfile> & { productId: string }): OwnProductLogisticProfile {
  return {
    polUnit: 1,
    ownDeliveryAllowed: true,
    vehicleMinCode: null,
    compatibleVehicleCodes: ['motorcycle', 'car'],
    ...partial,
  }
}

describe('selectOwnVehicle', () => {
  it('POL=12 → moto', () => {
    const r = selectOwnVehicle({
      polTotal: 12,
      profiles: [p({ productId: 'a' })],
      categories,
      tariffs,
    })
    expect(r.ok).toBe(true)
    if (r.ok) expect(r.category.code).toBe('motorcycle')
  })

  it('POL=13 → carro', () => {
    const r = selectOwnVehicle({
      polTotal: 13,
      profiles: [p({ productId: 'a' })],
      categories,
      tariffs,
    })
    expect(r.ok).toBe(true)
    if (r.ok) expect(r.category.code).toBe('car')
  })

  it('vehicle_min carro com POL baixo → carro', () => {
    const r = selectOwnVehicle({
      polTotal: 2,
      profiles: [p({ productId: 'a', vehicleMinCode: 'car' })],
      categories,
      tariffs,
    })
    expect(r.ok).toBe(true)
    if (r.ok) expect(r.category.code).toBe('car')
  })

  it('incompatível com todos → manual_review', () => {
    const r = selectOwnVehicle({
      polTotal: 2,
      profiles: [p({ productId: 'a', compatibleVehicleCodes: ['van'] })],
      categories,
      tariffs,
    })
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.status).toBe('manual_review')
  })
})
