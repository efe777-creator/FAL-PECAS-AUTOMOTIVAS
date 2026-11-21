/** Core OTP WhatsApp — hash, E.164, TTL (Deno Edge). */

export type AuthOtpPurpose = 'account_verify' | 'password_reset'

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
  // 55 + DDD(2) + 9 + 8 dígitos = 13
  return /^55\d{2}9\d{8}$/.test(e164)
}

export function generateOtpCode(): string {
  const n = crypto.getRandomValues(new Uint32Array(1))[0]! % 1_000_000
  return String(n).padStart(6, '0')
}

export async function hashOtpCode(code: string, pepper: string): Promise<string> {
  const data = new TextEncoder().encode(`${pepper}:${code}`)
  const digest = await crypto.subtle.digest('SHA-256', data)
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

export function otpMessage(code: string, purpose: AuthOtpPurpose): string {
  const why =
    purpose === 'password_reset'
      ? 'recuperar a senha na FAL Peças'
      : 'confirmar sua conta na FAL Peças'
  return `FAL Peças: seu código para ${why} é ${code}. Válido por 10 minutos. Não compartilhe.`
}
