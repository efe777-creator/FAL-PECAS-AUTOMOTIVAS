import { describe, expect, it } from 'vitest'
import {
  hashOtpCode,
  isOtpExpired,
  isWhatsAppE164,
  OTP_TTL_MS,
  otpExpiresAt,
  toPhoneE164,
} from './authOtpHelpers'

describe('authOtpHelpers', () => {
  it('normaliza telefone BR para E.164', () => {
    expect(toPhoneE164('(11) 98765-4321')).toBe('5511987654321')
    expect(toPhoneE164('5511987654321')).toBe('5511987654321')
    expect(toPhoneE164('')).toBeNull()
  })

  it('valida WhatsApp E.164 (55+DDD+9+8)', () => {
    expect(isWhatsAppE164('5511987654321')).toBe(true)
    expect(isWhatsAppE164('551187654321')).toBe(false) // 10 dígitos nacionais
    expect(isWhatsAppE164('5511234567890')).toBe(false) // sem 9 após DDD
  })

  it('hash OTP é estável e sensível a pepper/código', async () => {
    const a = await hashOtpCode('123456', 'pepper-a')
    const b = await hashOtpCode('123456', 'pepper-a')
    const c = await hashOtpCode('123456', 'pepper-b')
    const d = await hashOtpCode('000000', 'pepper-a')
    expect(a).toBe(b)
    expect(a).not.toBe(c)
    expect(a).not.toBe(d)
    expect(a).toMatch(/^[a-f0-9]{64}$/)
  })

  it('TTL 10 min — expires_at e isOtpExpired', () => {
    const now = Date.parse('2026-11-21T12:00:00.000Z')
    const exp = otpExpiresAt(now)
    expect(Date.parse(exp) - now).toBe(OTP_TTL_MS)
    expect(isOtpExpired(exp, now + OTP_TTL_MS - 1)).toBe(false)
    expect(isOtpExpired(exp, now + OTP_TTL_MS + 1)).toBe(true)
  })
})
