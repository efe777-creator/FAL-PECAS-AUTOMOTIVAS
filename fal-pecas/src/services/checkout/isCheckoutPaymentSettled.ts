/** Pedido/pagamento já liquidado para sair do checkout mid-pay. */

export type CheckoutSettlementInput = {
  orderStatus?: string | null
  payments?: Array<{ status?: string | null }> | null
}

const APPROVED = new Set(['approved', 'authorized'])

/**
 * Settled se o pedido saiu de aguardando_pagamento OU algum payment approved.
 * Não trata ausência de paymentId como sucesso.
 */
export function isCheckoutPaymentSettled(input: CheckoutSettlementInput): boolean {
  const st = String(input.orderStatus ?? '')
    .trim()
    .toLowerCase()
  if (st && st !== 'aguardando_pagamento') return true

  const payments = input.payments ?? []
  return payments.some((p) => APPROVED.has(String(p.status ?? '').toLowerCase()))
}
