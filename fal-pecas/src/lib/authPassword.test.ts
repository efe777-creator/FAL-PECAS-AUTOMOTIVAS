import { describe, expect, it } from 'vitest'
import {
  MIN_PASSWORD_LENGTH,
  passwordRuleHint,
  passwordTooShortMessage,
} from './authPassword'

describe('authPassword', () => {
  it('expõe mínimo alinhado à regra do Auth', () => {
    expect(MIN_PASSWORD_LENGTH).toBe(6)
  })

  it('hint e mensagem citam o mesmo mínimo', () => {
    expect(passwordRuleHint()).toContain(String(MIN_PASSWORD_LENGTH))
    expect(passwordTooShortMessage()).toContain(String(MIN_PASSWORD_LENGTH))
  })
})
