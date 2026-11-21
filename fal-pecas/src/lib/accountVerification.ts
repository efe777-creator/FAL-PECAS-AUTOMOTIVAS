import type { UserProfile } from '@/types'

type VerifyUser = Pick<
  UserProfile,
  'accountVerifiedAt' | 'verificationGraceEndsAt' | 'emailConfirmed'
> | null | undefined

export function isAccountVerified(user: VerifyUser): boolean {
  if (!user) return false
  return Boolean(user.accountVerifiedAt || user.emailConfirmed)
}

/** Já passou das 48h sem confirmação. */
export function accountPastVerificationGrace(user: VerifyUser): boolean {
  if (!user || isAccountVerified(user)) return false
  const ends = user.verificationGraceEndsAt
  if (!ends) return false
  const endMs = Date.parse(ends)
  if (Number.isNaN(endMs)) return false
  return Date.now() > endMs
}

/**
 * Confirmação dura (bloqueia pagamento / redireciona no login):
 * — após 48h sem verificar, ou
 * — no pagamento do 1º pedido (mesmo dentro da graça).
 *
 * Antes disso: só aviso persistente leve, sem trancar a conta.
 */
export function accountNeedsHardVerification(
  user: VerifyUser,
  opts?: { isFirstOrderPayment?: boolean },
): boolean {
  if (!user || isAccountVerified(user)) return false
  if (opts?.isFirstOrderPayment) return true
  return accountPastVerificationGrace(user)
}

/** @deprecated alias — use accountNeedsHardVerification / accountPastVerificationGrace */
export function accountNeedsVerification(user: VerifyUser): boolean {
  return accountNeedsHardVerification(user)
}

/** Ainda dentro da janela de 48h sem verificação plena. */
export function accountInVerificationGrace(user: VerifyUser): boolean {
  if (!user || isAccountVerified(user)) return false
  const ends = user.verificationGraceEndsAt
  if (!ends) return false
  const endMs = Date.parse(ends)
  if (Number.isNaN(endMs)) return false
  return Date.now() <= endMs
}

export function verificationGraceRemainingLabel(
  graceEndsAt: string | null | undefined,
): string | null {
  if (!graceEndsAt) return null
  const endMs = Date.parse(graceEndsAt)
  if (Number.isNaN(endMs)) return null
  const ms = endMs - Date.now()
  if (ms <= 0) return null
  const hours = Math.ceil(ms / (60 * 60 * 1000))
  if (hours >= 24) {
    const days = Math.ceil(hours / 24)
    return `${days} dia${days === 1 ? '' : 's'}`
  }
  return `${hours} hora${hours === 1 ? '' : 's'}`
}
