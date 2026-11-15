/**
 * Enforce comercial de parcelas (espelho create-mp-payment).
 */
export type StoreDisplayRow = {
  enabled?: boolean | null
  max_installments?: number | null
  min_installment_amount?: number | null
  installments_enabled?: boolean | null
  card_enabled?: boolean | null
  credit_enabled?: boolean | null
  debit_enabled?: boolean | null
  allow_interest_installments?: boolean | null
  interest_free_max?: number | null
}

export function maxAllowedCardInstallments(
  amount: number,
  displayRow: StoreDisplayRow | null | undefined,
): number {
  const installmentsOn =
    displayRow?.installments_enabled != null
      ? Boolean(displayRow.installments_enabled)
      : Boolean(displayRow?.enabled)
  const allowInterest =
    displayRow?.allow_interest_installments != null
      ? Boolean(displayRow.allow_interest_installments)
      : true
  const freeMax = Math.max(0, Math.floor(Number(displayRow?.interest_free_max) || 0))
  let maxAllowed = 1
  if (installmentsOn && amount > 0) {
    const max = Math.min(Math.max(Math.floor(Number(displayRow?.max_installments) || 1), 1), 21)
    const minParcel = Math.max(Number(displayRow?.min_installment_amount) || 0, 0)
    maxAllowed = minParcel <= 0 ? max : Math.max(1, Math.min(max, Math.floor(amount / minParcel)))
    if (!allowInterest) {
      maxAllowed = freeMax <= 0 ? 1 : Math.min(maxAllowed, freeMax)
    }
  }
  return maxAllowed
}

export function assertInstallmentsAllowed(
  method: 'credit_card' | 'debit_card',
  installments: number,
  amount: number,
  displayRow: StoreDisplayRow | null | undefined,
): string | null {
  const cardEnabled = displayRow?.card_enabled != null ? Boolean(displayRow.card_enabled) : true
  const creditEnabled =
    displayRow?.credit_enabled != null ? Boolean(displayRow.credit_enabled) : cardEnabled
  const debitEnabled =
    displayRow?.debit_enabled != null ? Boolean(displayRow.debit_enabled) : cardEnabled
  if (method === 'debit_card') {
    if (!debitEnabled) return 'débito desativado comercialmente'
    if (!Number.isFinite(installments) || installments !== 1) return 'débito só à vista (1x)'
    return null
  }
  if (!creditEnabled) return 'crédito desativado comercialmente'
  const maxAllowed = maxAllowedCardInstallments(amount, displayRow)
  if (!Number.isFinite(installments) || installments < 1) return 'installments inválido'
  if (installments > maxAllowed) {
    const allowInterest =
      displayRow?.allow_interest_installments != null
        ? Boolean(displayRow.allow_interest_installments)
        : true
    const freeMax = Math.max(0, Math.floor(Number(displayRow?.interest_free_max) || 0))
    if (!allowInterest && freeMax > 0 && installments > freeMax) {
      return `sem juros só até ${freeMax}x (ou habilite juros)`
    }
    return `installments acima do permitido (máx. ${maxAllowed})`
  }
  return null
}