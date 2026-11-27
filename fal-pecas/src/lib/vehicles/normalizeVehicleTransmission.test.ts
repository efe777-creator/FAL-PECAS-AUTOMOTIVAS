import { describe, expect, it } from 'vitest'
import {
  normalizeTransmissionDetail,
  normalizeVehicleTransmission,
  parseTransmissionInput,
} from './normalizeVehicleTransmission'

describe('normalizeVehicleTransmission', () => {
  it('vazio → null', () => {
    expect(normalizeVehicleTransmission('')).toBeNull()
    expect(normalizeVehicleTransmission(null)).toBeNull()
  })

  it('Manual → manual', () => {
    expect(normalizeVehicleTransmission('Manual')).toBe('manual')
  })

  it('Automática sozinha → automatica, detalhe null', () => {
    expect(parseTransmissionInput('Automática')).toEqual({
      transmission: 'automatica',
      transmissionDetail: null,
    })
  })

  it('Automática CVT → automatica + cvt', () => {
    expect(parseTransmissionInput('Automática CVT')).toEqual({
      transmission: 'automatica',
      transmissionDetail: 'cvt',
    })
  })

  it('AMT → automatizada + amt', () => {
    expect(parseTransmissionInput('AMT')).toEqual({
      transmission: 'automatizada',
      transmissionDetail: 'amt',
    })
  })

  it('detalhe isolado', () => {
    expect(normalizeTransmissionDetail('CVT')).toBe('cvt')
  })
})
