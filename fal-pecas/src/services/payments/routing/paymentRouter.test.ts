import { describe, expect, it } from 'vitest'
import {
  decidePaymentRoute,
  DEFAULT_PIX_MP_MAX_AMOUNT_CENTS,
  moneyToAmountCents,
  resolveRoutedPaymentProvider,
} from '@/services/payments/routing/paymentRouter'

describe('paymentRouter (híbrido FAL PAY)', () => {
  const limit = DEFAULT_PIX_MP_MAX_AMOUNT_CENTS

  it('T1–T2: PIX até R$ 201,00 → Mercado Pago', () => {
    expect(resolveRoutedPaymentProvider({ method: 'pix', amountCents: moneyToAmountCents(50) })).toBe(
      'mercadopago',
    )
    expect(resolveRoutedPaymentProvider({ method: 'pix', amountCents: moneyToAmountCents(200) })).toBe(
      'mercadopago',
    )
    expect(resolveRoutedPaymentProvider({ method: 'pix', amountCents: moneyToAmountCents(201) })).toBe(
      'mercadopago',
    )
    expect(resolveRoutedPaymentProvider({ method: 'pix', amountCents: limit })).toBe('mercadopago')
  })

  it('T3–T4: PIX acima de R$ 201,00 → Asaas', () => {
    expect(
      resolveRoutedPaymentProvider({ method: 'pix', amountCents: moneyToAmountCents(201.01) }),
    ).toBe('asaas')
    expect(resolveRoutedPaymentProvider({ method: 'pix', amountCents: moneyToAmountCents(500) })).toBe(
      'asaas',
    )
    expect(resolveRoutedPaymentProvider({ method: 'pix', amountCents: limit + 1 })).toBe('asaas')
  })

  it('T5: cartão → Asaas em qualquer valor', () => {
    expect(
      resolveRoutedPaymentProvider({ method: 'credit_card', amountCents: moneyToAmountCents(50) }),
    ).toBe('asaas')
    expect(
      resolveRoutedPaymentProvider({ method: 'debit_card', amountCents: moneyToAmountCents(5000) }),
    ).toBe('asaas')
  })

  it('T6: boleto → Asaas', () => {
    expect(
      resolveRoutedPaymentProvider({ method: 'boleto', amountCents: moneyToAmountCents(100) }),
    ).toBe('asaas')
    expect(
      resolveRoutedPaymentProvider({ method: 'boleto', amountCents: moneyToAmountCents(2000) }),
    ).toBe('asaas')
  })

  it('decidePaymentRoute persiste ruleVersion', () => {
    const d = decidePaymentRoute({ method: 'pix', amountCents: 10_000 })
    expect(d.provider).toBe('mercadopago')
    expect(d.ruleVersion).toBe('fal-pay-hybrid-v1')
  })

  it('card_provider mercadopago mantém parcelas no MP', () => {
    expect(
      resolveRoutedPaymentProvider(
        { method: 'credit_card', amountCents: 5000 },
        { cardProvider: 'mercadopago' },
      ),
    ).toBe('mercadopago')
  })

  it('limite configurável não altera semântica inclusive', () => {
    expect(
      resolveRoutedPaymentProvider({
        method: 'pix',
        amountCents: 15_000,
        pixMpMaxAmountCents: 15_000,
      }),
    ).toBe('mercadopago')
    expect(
      resolveRoutedPaymentProvider({
        method: 'pix',
        amountCents: 15_001,
        pixMpMaxAmountCents: 15_000,
      }),
    ).toBe('asaas')
  })
})