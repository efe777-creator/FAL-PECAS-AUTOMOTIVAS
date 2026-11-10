import { describe, expect, it } from 'vitest'
import {
  detectPlateFormat,
  formatPlateMask,
  isValidPlate,
  normalizePlate,
  plateValidationMessage,
} from './plateNormalize'

describe('normalizePlate', () => {
  it('remove espaços, hífens e acentos', () => {
    expect(normalizePlate(' abc-1d23 ')).toBe('ABC1D23')
    expect(normalizePlate('ábc1234')).toBe('ABC1234')
  })
})

describe('detectPlateFormat / isValidPlate', () => {
  it('aceita Mercosul e antiga', () => {
    expect(detectPlateFormat('ABC1D23')).toBe('mercosul')
    expect(detectPlateFormat('ABC1234')).toBe('antiga')
    expect(isValidPlate('ABC1D23')).toBe(true)
    expect(isValidPlate('ABC1234')).toBe(true)
  })

  it('rejeita formatos inválidos', () => {
    expect(isValidPlate('AB12345')).toBe(false)
    expect(isValidPlate('ABCD123')).toBe(false)
    expect(isValidPlate('')).toBe(false)
  })
})

describe('formatPlateMask', () => {
  it('aplica hífen em padrão antiga parcial', () => {
    expect(formatPlateMask('abc1234')).toBe('ABC-1234')
  })

  it('mantém Mercosul sem hífen', () => {
    expect(formatPlateMask('ABC1D23')).toBe('ABC1D23')
  })
})

describe('plateValidationMessage', () => {
  it('mensagens claras', () => {
    expect(plateValidationMessage('')).toMatch(/Informe/)
    expect(plateValidationMessage('ABC')).toMatch(/incompleta/i)
    expect(plateValidationMessage('!!!!!!!')).toMatch(/inválido/i)
    expect(plateValidationMessage('ABC1D23')).toBeNull()
  })
})
