import { describe, expect, it, vi } from 'vitest'
import { createPaymentEngine } from '@/services/payments/engine/paymentEngine'

describe('paymentEngine PG05', () => {
  it('lista adaptador MP e resolve primary mercadopago', () => {
    const engine = createPaymentEngine(() => 'mercadopago')
    expect(engine.primaryProviderId()).toBe('mercadopago')
    expect(engine.listAdapters().map((a) => a.id)).toContain('mercadopago')
    expect(engine.getAdapter()?.label).toBe('Mercado Pago')
    expect(engine.getAdapter()?.capabilities().methods).toContain('pix')
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
