import { describe, expect, it } from 'vitest'
import { isCheckoutPaymentSettled } from './isCheckoutPaymentSettled'

describe('isCheckoutPaymentSettled', () => {
  it('aguardando_pagamento + pending → false', () => {
    expect(
      isCheckoutPaymentSettled({
        orderStatus: 'aguardando_pagamento',
        payments: [{ status: 'pending' }],
      }),
    ).toBe(false)
  })

  it('em_analise → true', () => {
    expect(isCheckoutPaymentSettled({ orderStatus: 'em_analise', payments: [] })).toBe(true)
  })

  it('payment approved mesmo com order aguardando → true', () => {
    expect(
      isCheckoutPaymentSettled({
        orderStatus: 'aguardando_pagamento',
        payments: [{ status: 'pending' }, { status: 'approved' }],
      }),
    ).toBe(true)
  })

  it('sem status e sem payments → false', () => {
    expect(isCheckoutPaymentSettled({})).toBe(false)
  })
})
