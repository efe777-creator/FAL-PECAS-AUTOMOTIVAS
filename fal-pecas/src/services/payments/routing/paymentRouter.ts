/**
 * FAL PAY — roteamento híbrido Mercado Pago + Asaas (regra única, centavos inteiros).
 * PIX até limite inclusive → MP; PIX acima → Asaas.
 * Cartão → config da loja; se Asaas cartão ainda não está pronto, cai para Mercado Pago.
 * Boleto → Asaas (ainda fora do checkout).
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
  /** false = cartão Asaas ainda não no checkout; cai para Mercado Pago. */
  asaasCardCheckoutReady?: boolean
}

export interface PaymentRouteInput {
  method: RoutablePaymentMethod
  /** Valor efetivamente cobrado, em centavos (Math.round(total * 100)). */
  amountCents: number
  /** Limite configurável; default R$ 201,00 inclusive. */
  pixMpMaxAmountCents?: number
}

export interface PaymentRouteDecision extends PaymentRouteInput {
  provider: RoutedPaymentProviderId
  ruleVersion: string
}

const RULE_VERSION = 'fal-pay-hybrid-v1'

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

  if (method === 'boleto') {
    return store?.boletoProvider ?? 'asaas'
  }

  if (method === 'credit_card' || method === 'debit_card') {
    const wanted = store?.cardProvider ?? 'asaas'
    if (wanted === 'asaas' && store?.asaasCardCheckoutReady === false) {
      return 'mercadopago'
    }
    return wanted
  }

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
): PaymentRouteDecision {
  const limit =
    input.pixMpMaxAmountCents ?? store?.pixMpMaxAmountCents ?? DEFAULT_PIX_MP_MAX_AMOUNT_CENTS
  return {
    ...input,
    pixMpMaxAmountCents: limit,
    provider: resolveRoutedPaymentProvider(input, store),
    ruleVersion: RULE_VERSION,
  }
}