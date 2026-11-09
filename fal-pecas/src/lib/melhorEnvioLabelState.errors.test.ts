import { describe, expect, it } from 'vitest'
import { meLastErrorLabel } from './melhorEnvioLabelState'

describe('meLastErrorLabel (014)', () => {
  it('traduz códigos conhecidos', () => {
    expect(meLastErrorLabel('origin_or_dest_postal_missing')).toMatch(/CEP/)
    expect(meLastErrorLabel('insufficient_balance')).toMatch(/Saldo/)
  })

  it('repassa desconhecido', () => {
    expect(meLastErrorLabel('weird_code_xyz')).toBe('weird_code_xyz')
  })

  it('null vazio', () => {
    expect(meLastErrorLabel(null)).toBeNull()
    expect(meLastErrorLabel('  ')).toBeNull()
  })
})
