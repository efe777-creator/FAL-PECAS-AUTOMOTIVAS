import { describe, expect, it, vi, beforeEach } from 'vitest'

vi.mock('@/services/payments/createFalPaymentService', () => ({
  invokeCreateFalPayment: vi.fn(async (input: { orderId: string; method: string }) => ({
    paymentId: 'gw-1',
    provider: input.method === 'pix' ? 'mercadopago' : 'asaas',
    status: 'pending',
    orderId: input.orderId,
  })),
}))

vi.mock('@/services/payments/paymentService', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/services/payments/paymentService')>()
  return {
    ...actual,
    isMercadoPagoCheckoutEnabled: () => true,
  }
})

import { createPaymentEngine } from '@/services/payments/engine/paymentEngine'
import { invokeCreateFalPayment } from '@/services/payments/createFalPaymentService'

describe('paymentEngine PG05', () => {
  beforeEach(() => {
    vi.mocked(invokeCreateFalPayment).mockClear()
  })

  it('lista adaptadores MP e Asaas e resolve primary mercadopago', () => {
    const engine = createPaymentEngine(() => 'mercadopago')
    expect(engine.primaryProviderId()).toBe('mercadopago')
    const ids = engine.listAdapters().map((a) => a.id)
    expect(ids).toContain('mercadopago')
    expect(ids).toContain('asaas')
    expect(engine.getAdapter('mercadopago')?.label).toBe('Mercado Pago')
    expect(engine.getAdapter('mercadopago')?.capabilities().methods).toEqual(['pix'])
    expect(engine.getAdapter('asaas')?.capabilities().methods).toContain('credit_card')
  })

  it('createPayment no híbrido usa gateway create-fal-payment', async () => {
    const engine = createPaymentEngine(() => 'mercadopago')
    const out = await engine.createPayment({ orderId: 'o1', method: 'debit_card', installments: 1 })
    expect(out.paymentId).toBe('gw-1')
    expect(out.provider).toBe('asaas')
    expect(invokeCreateFalPayment).toHaveBeenCalledWith({
      orderId: 'o1',
      method: 'debit_card',
      installments: 1,
    })
  })

  it('MP adapter rejeita cartão', async () => {
    const engine = createPaymentEngine(() => 'mercadopago')
    const adapter = engine.getAdapter('mercadopago')!
    await expect(
      adapter.createPayment({ orderId: 'o1', method: 'credit_card', installments: 1 }),
    ).rejects.toThrow(/somente Pix/i)
  })
})
