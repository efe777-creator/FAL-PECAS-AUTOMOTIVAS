import { describe, expect, it } from 'vitest'
import {
  normalizeTractionDetail,
  normalizeVehicleTraction,
  parseTractionInput,
} from './normalizeVehicleTraction'

describe('normalizeVehicleTraction', () => {
  it('4x2 sozinho não vira eixo', () => {
    expect(parseTractionInput('4x2')).toEqual({
      traction: '4x2',
      tractionDetail: null,
    })
    expect(normalizeTractionDetail('4x2')).toBeNull()
  })

  it('4x2 dianteira', () => {
    expect(parseTractionInput('4x2 dianteira')).toEqual({
      traction: '4x2',
      tractionDetail: 'dianteira',
    })
  })

  it('AWD e 4x4', () => {
    expect(normalizeVehicleTraction('AWD')).toBe('awd')
    expect(normalizeVehicleTraction('4X4')).toBe('4x4')
  })

  it('vazio → null', () => {
    expect(normalizeVehicleTraction('')).toBeNull()
  })
})
