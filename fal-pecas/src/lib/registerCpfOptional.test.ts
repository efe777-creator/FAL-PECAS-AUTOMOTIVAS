import { describe, expect, it } from 'vitest'
import { isValidCpf, onlyDigits } from './document'

/** Regra 030: CPF no cadastro é opcional; se preenchido, precisa ser válido. */
function registerCpfOk(raw: string): boolean {
  const digits = onlyDigits(raw)
  if (!digits) return true
  return isValidCpf(digits)
}

describe('registerCpfOptional (030)', () => {
  it('aceita vazio', () => {
    expect(registerCpfOk('')).toBe(true)
    expect(registerCpfOk('   ')).toBe(true)
  })

  it('rejeita incompleto', () => {
    expect(registerCpfOk('123')).toBe(false)
  })

  it('aceita CPF válido mascarado', () => {
    expect(registerCpfOk('529.982.247-25')).toBe(true)
  })
})
