import { describe, expect, it } from 'vitest'
import { isValidPhone, isValidWhatsAppPhone, normalizePhone } from './phone'

describe('phone / WhatsApp', () => {
  it('normaliza só dígitos', () => {
    expect(normalizePhone('(11) 98765-4321')).toBe('11987654321')
  })

  it('aceita fixo e celular em isValidPhone', () => {
    expect(isValidPhone('1133334444')).toBe(true)
    expect(isValidPhone('11987654321')).toBe(true)
  })

  it('WhatsApp exige celular 11 dígitos com 9', () => {
    expect(isValidWhatsAppPhone('11987654321')).toBe(true)
    expect(isValidWhatsAppPhone('1133334444')).toBe(false)
    expect(isValidWhatsAppPhone('11887654321')).toBe(false)
    expect(isValidWhatsAppPhone('')).toBe(false)
  })
})
