/** Canais de pagamento do checkout / retomada (Mercado Pago). */

export type MpPayChannel = 'pix' | 'credit_card' | 'debit_card'

export type PayChannelAvailability = {
  pix: boolean
  credit: boolean
  debit: boolean
  card: boolean
}

export function isCardMpChannel(ch: MpPayChannel): boolean {
  return ch === 'credit_card' || ch === 'debit_card'
}

/** Aceita legado `card` → crédito; fallback seguro = pix. */
export function normalizeMpChannel(ch: string | null | undefined): MpPayChannel {
  const n = String(ch ?? '')
    .trim()
    .toLowerCase()
  if (n === 'debit_card' || n === 'debit') return 'debit_card'
  if (n === 'credit_card' || n === 'credit' || n === 'card') return 'credit_card'
  if (n === 'pix') return 'pix'
  return 'pix'
}

/** Preferência comercial para “abrir cartão” quando o usuário não escolheu crédito/débito. */
export function defaultCardChannel(avail: Pick<PayChannelAvailability, 'credit' | 'debit'>): MpPayChannel {
  if (avail.credit) return 'credit_card'
  if (avail.debit) return 'debit_card'
  return 'credit_card'
}

/**
 * Garante canal ainda liberado por política/integração.
 * Usado em rádios, retry e troca Pix→cartão — sempre com valor explícito (nunca stale).
 */
export function resolveSelectableChannel(
  desired: MpPayChannel | string | null | undefined,
  avail: PayChannelAvailability,
): MpPayChannel {
  const ch = normalizeMpChannel(desired)
  if (ch === 'pix' && avail.pix) return 'pix'
  if (ch === 'credit_card' && avail.credit) return 'credit_card'
  if (ch === 'debit_card' && avail.debit) return 'debit_card'
  // Cartão desejado indisponível → outro cartão antes de Pix.
  if (isCardMpChannel(ch) && avail.card) return defaultCardChannel(avail)
  if (ch === 'pix' && avail.card) return defaultCardChannel(avail)
  if (avail.pix) return 'pix'
  if (avail.credit) return 'credit_card'
  if (avail.debit) return 'debit_card'
  return 'pix'
}

export function preferredPaymentTypeFromChannel(
  ch: MpPayChannel,
): 'credit_card' | 'debit_card' {
  return ch === 'debit_card' ? 'debit_card' : 'credit_card'
}
