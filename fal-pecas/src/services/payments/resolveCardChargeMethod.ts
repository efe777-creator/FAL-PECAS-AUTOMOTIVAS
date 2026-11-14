/** Resolve método de cobrança cartão: canal do cliente > rótulo BIN do MP. */

export type CardChargeMethod = 'credit_card' | 'debit_card'

export type BinDetectedKind = CardChargeMethod | 'unknown'

/**
 * O catálogo BIN do Mercado Pago no BR frequentemente marca débito Mastercard/Visa
 * como `credit_card`. Por isso a preferência explícita do checkout/retomada manda;
 * o BIN só informa aviso suave, nunca bloqueia.
 */
export function detectBinCardKind(
  paymentTypeId: string | null | undefined,
): BinDetectedKind {
  const raw = String(paymentTypeId ?? '')
    .trim()
    .toLowerCase()
  if (!raw) return 'unknown'
  if (raw.includes('debit')) return 'debit_card'
  if (raw.includes('credit')) return 'credit_card'
  return 'unknown'
}

export function resolveCardChargeMethod(input: {
  preferred: CardChargeMethod
  binPaymentTypeId?: string | null
}): {
  method: CardChargeMethod
  binDetected: BinDetectedKind
  binMismatch: boolean
} {
  const binDetected = detectBinCardKind(input.binPaymentTypeId)
  const method = input.preferred
  const binMismatch = binDetected !== 'unknown' && binDetected !== method
  return { method, binDetected, binMismatch }
}

/**
 * Se o MP devolver vários métodos no mesmo BIN, prefere o que casa com o canal.
 * Senão mantém o primeiro (comportamento anterior).
 */
export function pickPaymentMethodForPreferred<T extends { payment_type_id?: string | null }>(
  results: T[] | null | undefined,
  preferred: CardChargeMethod,
): T | undefined {
  if (!results?.length) return undefined
  const match = results.find((r) => {
    const kind = detectBinCardKind(r.payment_type_id)
    return kind === preferred
  })
  return match ?? results[0]
}

/**
 * No BR o catálogo BIN costuma devolver `visa`/`master` mesmo para débito.
 * A API de pagamentos exige `debvisa`/`debmaster` para processar como débito
 * (docs MP: payment_method_id débito ≠ bandeira de crédito).
 */
const CREDIT_TO_DEBIT_METHOD_ID: Record<string, string> = {
  visa: 'debvisa',
  master: 'debmaster',
  mastercard: 'debmaster',
}

const DEBIT_TO_CREDIT_METHOD_ID: Record<string, string> = {
  debvisa: 'visa',
  debmaster: 'master',
}

export function alignPaymentMethodIdForPreferred(
  preferred: CardChargeMethod,
  paymentMethodId: string,
): { paymentMethodId: string; remapped: boolean } {
  const id = String(paymentMethodId ?? '')
    .trim()
    .toLowerCase()
  if (!id) return { paymentMethodId: id, remapped: false }

  if (preferred === 'debit_card') {
    if (id.startsWith('deb') || id.includes('debit')) {
      return { paymentMethodId: id, remapped: false }
    }
    const mapped = CREDIT_TO_DEBIT_METHOD_ID[id]
    if (mapped) return { paymentMethodId: mapped, remapped: true }
    return { paymentMethodId: id, remapped: false }
  }

  const mapped = DEBIT_TO_CREDIT_METHOD_ID[id]
  if (mapped) return { paymentMethodId: mapped, remapped: true }
  return { paymentMethodId: id, remapped: false }
}
