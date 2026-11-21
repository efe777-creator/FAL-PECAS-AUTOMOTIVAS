import { describe, expect, it } from 'vitest'
import {
  accountInVerificationGrace,
  accountNeedsHardVerification,
  accountPastVerificationGrace,
  isAccountVerified,
  verificationGraceRemainingLabel,
} from './accountVerification'

describe('accountVerification', () => {
  it('conta verificada por accountVerifiedAt ou emailConfirmed', () => {
    expect(
      isAccountVerified({
        accountVerifiedAt: '2026-01-01T00:00:00Z',
        verificationGraceEndsAt: null,
        emailConfirmed: false,
      }),
    ).toBe(true)
    expect(
      isAccountVerified({
        accountVerifiedAt: null,
        verificationGraceEndsAt: null,
        emailConfirmed: true,
      }),
    ).toBe(true)
  })

  it('hard após graça; soft dentro da graça', () => {
    const past = {
      accountVerifiedAt: null as string | null,
      verificationGraceEndsAt: '2020-01-01T00:00:00Z',
      emailConfirmed: false,
    }
    expect(accountPastVerificationGrace(past)).toBe(true)
    expect(accountNeedsHardVerification(past)).toBe(true)

    const future = {
      accountVerifiedAt: null as string | null,
      verificationGraceEndsAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
      emailConfirmed: false,
    }
    expect(accountInVerificationGrace(future)).toBe(true)
    expect(accountNeedsHardVerification(future)).toBe(false)
  })

  it('1º pedido exige hard mesmo na graça', () => {
    const future = {
      accountVerifiedAt: null as string | null,
      verificationGraceEndsAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
      emailConfirmed: false,
    }
    expect(accountNeedsHardVerification(future, { isFirstOrderPayment: true })).toBe(true)
  })

  it('label de restante não é null com prazo futuro', () => {
    const future = new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString()
    expect(verificationGraceRemainingLabel(future)).toMatch(/hora/)
  })
})
