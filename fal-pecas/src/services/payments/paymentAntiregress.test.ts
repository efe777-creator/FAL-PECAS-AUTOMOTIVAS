/**
 * Anti-regressão FAL PAY — regras PIX/cartão e fronteiras preview/prod.
 */
import { readFileSync, existsSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import {
  DEFAULT_PIX_MP_MAX_AMOUNT_CENTS,
  decidePaymentRoute,
  moneyToAmountCents,
  resolveRoutedPaymentProvider,
} from '@/services/payments/routing/paymentRouter'
import { ASAAS_CARD_CHECKOUT_READY } from '@/services/payments/falPayCapabilities'

const root = resolve(__dirname, '../../..')

function read(rel: string) {
  return readFileSync(resolve(root, rel), 'utf8')
}

describe('FAL PAY regras (contrato vivo)', () => {
  it('PIX ≤ R$ 201,00 → Mercado Pago; acima → Asaas', () => {
    expect(DEFAULT_PIX_MP_MAX_AMOUNT_CENTS).toBe(20_100)
    expect(
      resolveRoutedPaymentProvider({
        method: 'pix',
        amountCents: moneyToAmountCents(201),
      }),
    ).toBe('mercadopago')
    expect(
      resolveRoutedPaymentProvider({
        method: 'pix',
        amountCents: moneyToAmountCents(201.01),
      }),
    ).toBe('asaas')
  })

  it('crédito e débito → sempre Asaas (ignora override cardProvider)', () => {
    expect(
      resolveRoutedPaymentProvider(
        { method: 'credit_card', amountCents: 100 },
        { cardProvider: 'mercadopago' },
      ),
    ).toBe('asaas')
    expect(
      resolveRoutedPaymentProvider({ method: 'debit_card', amountCents: 100 }),
    ).toBe('asaas')
    expect(ASAAS_CARD_CHECKOUT_READY).toBe(true)
  })

  it('decidePaymentRoute mantém ruleVersion híbrida', () => {
    const d = decidePaymentRoute({ method: 'pix', amountCents: 5000 })
    expect(d.ruleVersion).toBe('fal-pay-hybrid-v1')
    expect(d.provider).toBe('mercadopago')
  })
})

describe('FAL PAY anti-regressão (fonte)', () => {
  it('checkout usa createFalPayment híbrido (não inventa provider no FE)', () => {
    const page = read('src/pages/Checkout/CheckoutPage.tsx')
    expect(page).toMatch(/createFalPayment/)
    expect(page).toMatch(/resolveEffectivePaymentAvailability/)
    expect(page).toMatch(/isMercadoPagoCheckoutEnabled/)

    const engine = read('src/services/payments/engine/paymentEngine.ts')
    expect(engine).toMatch(/invokeCreateFalPayment/)
    expect(engine).toMatch(/create-fal-payment|invokeCreateFalPayment/)
  })

  it('Edges de pagamento existem e cartão não cai no create-mp-payment', () => {
    expect(existsSync(resolve(root, 'supabase/functions/create-fal-payment/index.ts'))).toBe(
      true,
    )
    expect(existsSync(resolve(root, 'supabase/functions/create-mp-payment/index.ts'))).toBe(
      true,
    )
    expect(existsSync(resolve(root, 'supabase/functions/create-asaas-payment/index.ts'))).toBe(
      true,
    )
    expect(existsSync(resolve(root, 'supabase/functions/pay-asaas-credit-card/index.ts'))).toBe(
      true,
    )

    const router = read('supabase/functions/_shared/paymentRouterCore.ts')
    expect(router).toMatch(/credit_card|debit_card/)
    expect(router).toMatch(/sempre Asaas|always Asaas|method === 'credit_card'/)
  })

  it('MP Brick / Asaas painéis: cartão Asaas no checkout', () => {
    const asaas = read('src/components/payments/AsaasCardPanel.tsx')
    expect(asaas).toMatch(/createFalPayment/)
    const capabilities = read('src/services/payments/falPayCapabilities.ts')
    expect(capabilities).toMatch(/ASAAS_CARD_CHECKOUT_READY/)
  })
})
