/**
 * Canais de recuperação de senha.
 * - WhatsApp (código): UI preparada; envio real com provider + domínio.
 * - E-mail (link): só com domínio linkado no Supabase Auth (`VITE_AUTH_EMAIL_RECOVERY=1`).
 */

export function isAuthEmailRecoveryEnabled(): boolean {
  const v = String(import.meta.env.VITE_AUTH_EMAIL_RECOVERY ?? '').trim().toLowerCase()
  return v === '1' || v === 'true' || v === 'yes'
}

/** Provider OTP WhatsApp de recuperação ligado (Edge + secrets). */
export function isAuthWhatsAppRecoveryReady(): boolean {
  const v = String(import.meta.env.VITE_AUTH_WHATSAPP_RECOVERY ?? '').trim().toLowerCase()
  return v === '1' || v === 'true' || v === 'yes'
}
