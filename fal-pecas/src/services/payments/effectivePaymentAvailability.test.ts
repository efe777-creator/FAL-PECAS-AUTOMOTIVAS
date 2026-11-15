import { describe, expect, it, vi } from 'vitest'
import { resolveEffectivePaymentAvailability } from '@/services/payments/effectivePaymentAvailability'
import type { PaymentRoutingConfig } from '@/services/payments/paymentRoutingService'

vi.mock('@/services/payments/paymentService', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/services/payments/paymentService')>()
  return {
    ...actual,
    isMercadoPagoCheckoutEnabled: () => true,
  }
})

const routing: PaymentRoutingConfig = {
  pixMpMaxAmountCents: 20_100,
  pixBelowLimitProvider: 'mercadopago',
  pixAboveLimitProvider: 'asaas',
  cardProvider: 'asaas',
  boletoProvider: 'asaas',
  asaasEnabled: true,
  mercadopagoEnabled: true,
}

const settings = {
  pixEnabled: true,
  creditEnabled: true,
  debitEnabled: true,
  cardEnabled: true,
  installmentsEnabled: true,
} as const

describe('resolveEffectivePaymentAvailability', () => {
  it('PIX abaixo do limite usa Mercado Pago mesmo com cartão no Asaas', () => {
    const avail = resolveEffectivePaymentAvailability(settings as never, routing, 10_000)
    expect(avail.pix).toBe(true)
    expect(avail.credit).toBe(true)
    expect(avail.debit).toBe(true)
  })

  it('PIX acima do limite some se Asaas estiver desligado', () => {
    const avail = resolveEffectivePaymentAvailability(
      settings as never,
      { ...routing, asaasEnabled: false },
      25_000,
    )
    expect(avail.pix).toBe(false)
  })

  it('PIX acima do limite permanece se Asaas estiver ligado', () => {
    const avail = resolveEffectivePaymentAvailability(settings as never, routing, 25_000)
    expect(avail.pix).toBe(true)
  })
})
