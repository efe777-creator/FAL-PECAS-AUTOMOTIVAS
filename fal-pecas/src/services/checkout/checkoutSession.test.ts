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
})
