import { afterEach, describe, expect, it } from 'vitest'
import {
  clearCheckoutIdempotencyKey,
  clearCheckoutSession,
  loadCheckoutIdempotencyKey,
  loadCheckoutSession,
  saveCheckoutSession,
} from './checkoutSession'

afterEach(() => {
  clearCheckoutSession()
  clearCheckoutIdempotencyKey()
})

describe('checkoutSession (C2)', () => {
  it('persiste e recarrega contexto', () => {
    saveCheckoutSession({
      orderId: 'ord-1',
      paymentId: 'pay-1',
      idempotencyKey: '11111111-1111-1111-1111-111111111111',
      channel: 'pix',
      amount: 10,
    })
    const loaded = loadCheckoutSession()
    expect(loaded?.orderId).toBe('ord-1')
    expect(loaded?.paymentId).toBe('pay-1')
    expect(loaded?.channel).toBe('pix')
  })

  it('idempotency key estável na sessão', () => {
    const a = loadCheckoutIdempotencyKey()
    const b = loadCheckoutIdempotencyKey()
    expect(a).toBe(b)
  })

  it('round-trip credit_card e debit_card', () => {
    saveCheckoutSession({
      orderId: 'ord-cc',
      paymentId: undefined,
      idempotencyKey: '22222222-2222-2222-2222-222222222222',
      channel: 'credit_card',
      amount: 99.9,
    })
    expect(loadCheckoutSession()?.channel).toBe('credit_card')

    saveCheckoutSession({
      orderId: 'ord-cc',
      paymentId: undefined,
      idempotencyKey: '22222222-2222-2222-2222-222222222222',
      channel: 'debit_card',
      amount: 99.9,
    })
    expect(loadCheckoutSession()?.channel).toBe('debit_card')
    expect(loadCheckoutSession()?.orderId).toBe('ord-cc')
  })

  it('aceita canal legado card', () => {
    saveCheckoutSession({
      orderId: 'ord-legacy',
      idempotencyKey: '33333333-3333-3333-3333-333333333333',
      channel: 'card',
      amount: 1,
    })
    expect(loadCheckoutSession()?.channel).toBe('card')
  })
})
