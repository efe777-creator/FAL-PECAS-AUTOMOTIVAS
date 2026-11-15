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

export type StorePaymentRoutingOverrides = {
  pixMpMaxAmountCents?: number
  pixBelowLimitProvider?: RoutedPaymentProviderId
  pixAboveLimitProvider?: RoutedPaymentProviderId
  cardProvider?: RoutedPaymentProviderId
  boletoProvider?: RoutedPaymentProviderId
}

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
  store?: StorePaymentRoutingOverrides,
): RoutedPaymentProviderId {
  const limit =
    input.pixMpMaxAmountCents ?? store?.pixMpMaxAmountCents ?? DEFAULT_PIX_MP_MAX_AMOUNT_CENTS
  const method = input.method
  if (method === 'boleto') return store?.boletoProvider ?? 'asaas'
  if (method === 'credit_card' || method === 'debit_card') return store?.cardProvider ?? 'asaas'
  if (method === 'pix') {
    return input.amountCents <= limit
      ? (store?.pixBelowLimitProvider ?? 'mercadopago')
      : (store?.pixAboveLimitProvider ?? 'asaas')
  }
  return 'mercadopago'
}

export function decidePaymentRoute(
  input: PaymentRouteInput,
  store?: StorePaymentRoutingOverrides,
) {
  const limit =
    input.pixMpMaxAmountCents ?? store?.pixMpMaxAmountCents ?? DEFAULT_PIX_MP_MAX_AMOUNT_CENTS
  return {
    ...input,
    pixMpMaxAmountCents: limit,
    provider: resolveRoutedPaymentProvider(input, store),
    ruleVersion: PAYMENT_ROUTE_RULE_VERSION,
  }
}