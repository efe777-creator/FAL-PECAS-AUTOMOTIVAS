/**
 * Espelho Deno do roteador FAL PAY (manter sincronizado com src/.../paymentRouter.ts).
 */
export const DEFAULT_PIX_MP_MAX_AMOUNT_CENTS = 20_100

export type RoutedPaymentProviderId = 'mercadopago' | 'asaas'

export type RoutablePaymentMethod =
  | 'pix'
  | 'credit_card'
  | 'debit_card'
  | 'boleto'
  | 'other'

export interface PaymentRouteInput {
  method: RoutablePaymentMethod
  amountCents: number
  pixMpMaxAmountCents?: number
}

export const PAYMENT_ROUTE_RULE_VERSION = 'fal-pay-hybrid-v1'

export function moneyToAmountCents(total: number): number {
  if (!Number.isFinite(total) || total < 0) return 0
  return Math.round(total * 100)
}

export function resolveRoutedPaymentProvider(
  input: PaymentRouteInput,
): RoutedPaymentProviderId {
  const limit = input.pixMpMaxAmountCents ?? DEFAULT_PIX_MP_MAX_AMOUNT_CENTS
  if (input.method === 'boleto' || input.method === 'credit_card' || input.method === 'debit_card') {
    return 'asaas'
  }
  if (input.method === 'pix') {
    return input.amountCents <= limit ? 'mercadopago' : 'asaas'
  }
  return 'mercadopago'
}

export function decidePaymentRoute(input: PaymentRouteInput) {
  return {
    ...input,
    provider: resolveRoutedPaymentProvider(input),
    ruleVersion: PAYMENT_ROUTE_RULE_VERSION,
  }
}