/**
 * Helpers OTP espelhados do Edge `_shared/authOtpCore` para unit tests / UI.
 * Fonte de verdade no Edge; manter regras alinhadas.
 */

export const OTP_TTL_MS = 10 * 60 * 1000
export const OTP_MAX_ATTEMPTS = 5
export const OTP_RESEND_COOLDOWN_MS = 60_000
export const OTP_MAX_PER_HOUR = 5

/** Digits BR → E.164 (55…). */
export function toPhoneE164(raw: string): string | null {
  let d = String(raw ?? '').replace(/\D/g, '')
  if (!d) return null
  if (d.startsWith('55') && d.length >= 12) return d
  if (d.length === 10 || d.length === 11) return `55${d}`
  return null
}

export function isWhatsAppE164(e164: string): boolean {
  return /^55\d{2}9\d{8}$/.test(e164)
}

export async function hashOtpCode(code: string, pepper: string): Promise<string> {
  const data = new TextEncoder().encode(`${pepper}:${code}`)
  const digest = await crypto.subtle.digest('SHA-256', data)
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

export function isOtpExpired(expiresAtIso: string, nowMs = Date.now()): boolean {
  return Date.parse(expiresAtIso) < nowMs
}

export function otpExpiresAt(fromMs = Date.now()): string {
  return new Date(fromMs + OTP_TTL_MS).toISOString()
}
