import { describe, expect, it } from 'vitest'
import { resolveCheckoutPaymentOutcome } from './resolveCheckoutPaymentOutcome'

/**
 * CHECKOUT-05 — matriz de recuperação: o que o mount deve fazer
 * após refresh, dado o estado do servidor (C2).
 */
describe('resume após refresh (servidor prevalece)', () => {
  it('approved no servidor → confirmação (não recria cobrança)', () => {
    const o = resolveCheckoutPaymentOutcome({
      orderId: 'ord-approved',
      orderStatus: 'em_analise',
      paymentId: 'pay-1',
      paymentStatus: 'approved',
    })
    expect(o).toEqual({ kind: 'confirmed', orderId: 'ord-approved' })
  })

  it('pending no servidor → retoma UI de pagamento', () => {
    const o = resolveCheckoutPaymentOutcome({
      orderId: 'ord-pending',
      orderStatus: 'aguardando_pagamento',
      paymentId: 'pay-2',
      paymentStatus: 'pending',
    })
    expect(o.kind).toBe('await_payment')
  })

  it('expired no servidor → retry no mesmo pedido', () => {
    const o = resolveCheckoutPaymentOutcome({
      orderId: 'ord-exp',
      orderStatus: 'aguardando_pagamento',
      paymentId: 'pay-3',
      paymentStatus: 'expired',
    })
    expect(o.kind).toBe('retry_payment')
  })

  it('contexto local sem paymentId + servidor sem cobrança → order_only (não fake success)', () => {
    const o = resolveCheckoutPaymentOutcome({
      orderId: 'ord-only',
      orderStatus: 'aguardando_pagamento',
    })
    expect(o.kind).toBe('order_only')
    expect(o.kind).not.toBe('confirmed')
  })
})
