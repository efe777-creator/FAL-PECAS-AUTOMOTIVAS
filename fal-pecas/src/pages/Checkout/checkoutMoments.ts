/**
 * Checkout — 3 momentos efetivos sobre steps internos 0–4.
 * 0 Endereço (steps 0–1) · 1 Entrega (step 2) · 2 Pagamento (steps 3–4)
 */

export const MOMENT_LABELS = ['Endereço', 'Entrega', 'Pagamento'] as const

export type CheckoutMomentIndex = 0 | 1 | 2

/**
 * Momento pela step interna.
 * Com cobrança aberta o usuário pode voltar à entrega/endereço em só-leitura.
 */
export function resolveMomentIndex(step: number, _paymentAwaiting?: boolean): CheckoutMomentIndex {
  if (step >= 3) return 2
  if (step >= 2) return 1
  return 0
}

/**
 * @param paymentAwaiting — cobrança Pix/cartão aberta: permite alternar momentos
 *   (entrega/endereço = view-only na UI).
 */
export function isMomentClickable(input: {
  moment: CheckoutMomentIndex
  current: CheckoutMomentIndex
  paymentAwaiting: boolean
  maxReachedStep: number
  step: number
}): boolean {
  const { moment, current, paymentAwaiting, maxReachedStep, step } = input
  if (moment === current) return false
  if (paymentAwaiting) {
    return true
  }
  if (moment < current) return true
  if (moment === 1) return maxReachedStep >= 1 || step >= 1
  if (moment === 2) return maxReachedStep >= 2 || step >= 2
  return false
}

/** Step interno ao entrar no momento (voltar / avançar). */
export function targetStepForMoment(
  moment: CheckoutMomentIndex,
  ctx: { shippingOptionId: string; addressId: string; paymentAwaiting?: boolean },
): number {
  if (moment === 0) {
    if (ctx.addressId) return 1
    return 0
  }
  if (moment === 1) {
    return 2
  }
  return ctx.paymentAwaiting ? 4 : 3
}
