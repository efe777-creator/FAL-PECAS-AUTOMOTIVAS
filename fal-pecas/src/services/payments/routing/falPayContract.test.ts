import { describe, expect, it } from 'vitest'
import {
  decidePaymentRoute,
  DEFAULT_PIX_MP_MAX_AMOUNT_CENTS,
  moneyToAmountCents,
  resolveRoutedPaymentProvider,
} from '@/services/payments/routing/paymentRouter'

/**
 * Contrato FAL PAY híbrido (imutável):
 * - Pix <= R$ 201 → Mercado Pago
 * - Pix > R$ 201 → Asaas
 * - crédito/débito → sempre Asaas
 * - boleto → Asaas
 */
describe('FAL PAY contrato híbrido', () => {
  it('limites Pix inclusivos em centavos', () => {
    expect(moneyToAmountCents(201)).toBe(DEFAULT_PIX_MP_MAX_AMOUNT_CENTS)
    expect(
      resolveRoutedPaymentProvider({
        method: 'pix',
        amountCents: DEFAULT_PIX_MP_MAX_AMOUNT_CENTS,
      }),
    ).toBe('mercadopago')
    expect(
      resolveRoutedPaymentProvider({
        method: 'pix',
        amountCents: DEFAULT_PIX_MP_MAX_AMOUNT_CENTS + 1,
      }),
    ).toBe('asaas')
  })

  it('cartão ignora cardProvider e asaasCardCheckoutReady', () => {
    for (const method of ['credit_card', 'debit_card'] as const) {
      expect(
        resolveRoutedPaymentProvider(
          { method, amountCents: 1 },
          { cardProvider: 'mercadopago', asaasCardCheckoutReady: false },
        ),
      ).toBe('asaas')
    }
  })

  it('decidePaymentRoute devolve ruleVersion estável', () => {
    const d = decidePaymentRoute({ method: 'debit_card', amountCents: 9999 })
    expect(d.provider).toBe('asaas')
    expect(d.ruleVersion).toBe('fal-pay-hybrid-v1')
  })
})
