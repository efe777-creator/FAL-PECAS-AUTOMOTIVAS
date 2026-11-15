/**
 * FAL PAY — roteamento híbrido Mercado Pago + Asaas (regra única, centavos inteiros).
 * PIX até limite inclusive → MP; PIX acima → Asaas; cartão e boleto → Asaas.
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
): RoutedPaymentProviderId {
  const limit = input.pixMpMaxAmountCents ?? DEFAULT_PIX_MP_MAX_AMOUNT_CENTS
  const method = input.method

  if (method === 'boleto' || method === 'credit_card' || method === 'debit_card') {
    return 'asaas'
  }

  if (method === 'pix') {
    return input.amountCents <= limit ? 'mercadopago' : 'asaas'
  }

  return 'mercadopago'
}

export function decidePaymentRoute(input: PaymentRouteInput): PaymentRouteDecision {
  return {
    ...input,
    provider: resolveRoutedPaymentProvider(input),
    ruleVersion: RULE_VERSION,
  }
}