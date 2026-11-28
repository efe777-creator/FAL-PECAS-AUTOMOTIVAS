import { describe, expect, it } from 'vitest'
import { fuelFromVehicleName, normalizeVehicleFuel, VEHICLE_FUEL_OPTIONS } from './normalizeVehicleFuel'

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
    expect(normalizeVehicleFuel('Gás Natural')).toBe('GNV')
    expect(normalizeVehicleFuel('Gas Natural')).toBe('GNV')
    expect(normalizeVehicleFuel('Tetrafuel')).toBe('GNV')
    expect(normalizeVehicleFuel('Álcool')).toBe('Etanol')
    expect(normalizeVehicleFuel('Dies.')).toBe('Diesel')
    expect(normalizeVehicleFuel('Alc.')).toBe('Etanol')
    expect(normalizeVehicleFuel('Gasol.')).toBe('Gasolina')
  })

  it('nome FIPE traz o combustível quando o ano não trouxe', () => {
    expect(fuelFromVehicleName('Grand Siena TETRAFUEL 1.4 Evo F. Flex 8V')).toBe('GNV')
    expect(fuelFromVehicleName('Hilux CD 4x4 2.8 Diesel')).toBe('Diesel')
    expect(fuelFromVehicleName('Hilux CD Conquest 4x4 2.8 Die.Aut')).toBe('Diesel')
    expect(fuelFromVehicleName('Gol 1.0 Mi Total Flex 8V 4p')).toBe('Flex')
    expect(fuelFromVehicleName('Gol 1000i Alcool')).toBe('Etanol')
    expect(fuelFromVehicleName('Civic 1.6 Gasolina')).toBe('Gasolina')
    expect(fuelFromVehicleName('HB20 1.0 Comfort')).toBeNull()
  })

  it('desconhecido → null', () => {
    expect(normalizeVehicleFuel('querosene')).toBeNull()
    expect(normalizeVehicleFuel('bi-fuel xyz')).toBeNull()
  })
})
