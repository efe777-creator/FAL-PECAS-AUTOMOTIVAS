import { describe, expect, it, vi } from 'vitest'
import { createPaymentEngine } from '@/services/payments/engine/paymentEngine'

describe('paymentEngine PG05', () => {
  it('lista adaptadores MP e Asaas e resolve primary mercadopago', () => {
    const engine = createPaymentEngine(() => 'mercadopago')
    expect(engine.primaryProviderId()).toBe('mercadopago')
    const ids = engine.listAdapters().map((a) => a.id)
    expect(ids).toContain('mercadopago')
    expect(ids).toContain('asaas')
    expect(engine.getAdapter('mercadopago')?.label).toBe('Mercado Pago')
    expect(engine.getAdapter('mercadopago')?.capabilities().methods).toContain('pix')
  })

  it('createPayment delega ao adaptador', async () => {
    const engine = createPaymentEngine(() => 'mercadopago')
    const adapter = engine.getAdapter('mercadopago')!
    const spy = vi.spyOn(adapter, 'createPayment').mockResolvedValue({
      paymentId: 'p1',
      provider: 'mercadopago',
      status: 'pending',
      orderId: 'o1',
    })
    const out = await engine.createPayment({ orderId: 'o1', method: 'pix' })
    expect(out.paymentId).toBe('p1')
    expect(spy).toHaveBeenCalledWith({ orderId: 'o1', method: 'pix' })
    spy.mockRestore()
  })

  it('falha honesta se provedor sem adaptador (simulated)', async () => {
    const engine = createPaymentEngine(() => 'simulated')
    await expect(engine.createPayment({ orderId: 'o1', method: 'pix' })).rejects.toThrow(
      /adaptador/i,
    )
  })
})
