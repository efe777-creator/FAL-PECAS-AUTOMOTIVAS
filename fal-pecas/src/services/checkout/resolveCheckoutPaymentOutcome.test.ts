import { describe, expect, it } from 'vitest'
import { resolveCheckoutPaymentOutcome } from './resolveCheckoutPaymentOutcome'

describe('resolveCheckoutPaymentOutcome (C1)', () => {
  it('nunca trata !paymentId como confirmação de pagamento', () => {
    const r = resolveCheckoutPaymentOutcome({
      orderId: 'ord-1',
      orderStatus: 'aguardando_pagamento',
      paymentId: undefined,
    })
    expect(r.kind).not.toBe('confirmed')
    expect(r.kind).toBe('order_only')
  })

  it('payment approved → confirmed', () => {
    expect(
      resolveCheckoutPaymentOutcome({
        orderId: 'ord-1',
        paymentId: 'pay-1',
        paymentStatus: 'approved',
      }),
    ).toEqual({ kind: 'confirmed', orderId: 'ord-1' })
  })

  it('payment pending → await_payment', () => {
    expect(
      resolveCheckoutPaymentOutcome({
        orderId: 'ord-1',
        paymentId: 'pay-1',
        paymentStatus: 'pending',
      }),
    ).toEqual({
      kind: 'await_payment',
      orderId: 'ord-1',
      paymentId: 'pay-1',
      paymentStatus: 'pending',
    })
  })

  it('payment rejected → retry_payment', () => {
    const r = resolveCheckoutPaymentOutcome({
      orderId: 'ord-1',
      paymentId: 'pay-1',
      paymentStatus: 'rejected',
    })
    expect(r.kind).toBe('retry_payment')
    if (r.kind === 'retry_payment') {
      expect(r.paymentId).toBe('pay-1')
    }
  })

  it('payment expired → retry_payment', () => {
    const r = resolveCheckoutPaymentOutcome({
      orderId: 'ord-1',
      paymentId: 'pay-1',
      paymentStatus: 'expired',
    })
    expect(r.kind).toBe('retry_payment')
  })
})
