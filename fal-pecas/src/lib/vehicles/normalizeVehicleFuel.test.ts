import { describe, expect, it } from 'vitest'
import { normalizeVehicleFuel, VEHICLE_FUEL_OPTIONS } from './normalizeVehicleFuel'

describe('normalizeVehicleFuel', () => {
  it('vazio → null', () => {
    expect(normalizeVehicleFuel(null)).toBeNull()
    expect(normalizeVehicleFuel(undefined)).toBeNull()
    expect(normalizeVehicleFuel('')).toBeNull()
    expect(normalizeVehicleFuel('   ')).toBeNull()
  })

  it('labels canônicos case-insensitive', () => {
    for (const opt of VEHICLE_FUEL_OPTIONS) {
      expect(normalizeVehicleFuel(opt)).toBe(opt)
      expect(normalizeVehicleFuel(opt.toUpperCase())).toBe(opt)
    }
  })

  it('aliases comuns', () => {
    expect(normalizeVehicleFuel('FLEX')).toBe('Flex')
    expect(normalizeVehicleFuel('Alcool / Gasolina')).toBe('Flex')
    expect(normalizeVehicleFuel('álcool/gasolina')).toBe('Flex')
    expect(normalizeVehicleFuel('alcool')).toBe('Etanol')
    expect(normalizeVehicleFuel('gas')).toBe('Gasolina')
    expect(normalizeVehicleFuel('eletrico')).toBe('Elétrico')
    expect(normalizeVehicleFuel('hybrid')).toBe('Híbrido')
    expect(normalizeVehicleFuel('DIESEL')).toBe('Diesel')
    expect(normalizeVehicleFuel('gnv')).toBe('GNV')
  })

  it('desconhecido → null', () => {
    expect(normalizeVehicleFuel('querosene')).toBeNull()
    expect(normalizeVehicleFuel('bi-fuel xyz')).toBeNull()
  })
})
