import { describe, expect, it } from 'vitest'
import { normalizeUsername, parseOptionalUsername } from './accountUsername'

describe('accountUsername', () => {
  it('normaliza trim + lower', () => {
    expect(normalizeUsername('  Fe.User ')).toBe('fe.user')
  })

  it('aceita username válido', () => {
    expect(parseOptionalUsername('efe_01')).toBe('efe_01')
  })

  it('vazio vira null', () => {
    expect(parseOptionalUsername('   ')).toBeNull()
  })

  it('rejeita curto demais', () => {
    expect(() => parseOptionalUsername('ab')).toThrow(/3–32/)
  })

  it('rejeita caracteres inválidos', () => {
    expect(() => parseOptionalUsername('efe user')).toThrow(/apenas letras/)
  })
})
