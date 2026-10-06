import {
  buildIdempotencyKey,
  buildMpPaymentBody,
  mapMpResponseToPaymentFields,
  parseCreateMpPaymentClientBody,
  serverPaymentMethod,
} from '@/services/payments/mpCreatePaymentCore'
import { describe, expect, it } from 'vitest'

describe('parseCreateMpPaymentClientBody (F9-B conform)', () => {
  it('aceita orderId', () => {
    expect(parseCreateMpPaymentClientBody({ orderId: ' ord-1 ' })).toEqual({
      orderId: 'ord-1',
    })
  })

  it('rejeita amount', () => {
    expect(() =>
      parseCreateMpPaymentClientBody({ orderId: 'o1', amount: 10 }),
    ).toThrow(/amount/)
  })

  it('rejeita method', () => {
    expect(() =>
      parseCreateMpPaymentClientBody({ orderId: 'o1', method: 'pix' }),
    ).toThrow(/method/)
  })

  it('exige orderId', () => {
    expect(() => parseCreateMpPaymentClientBody({})).toThrow(/orderId/)
  })
})

describe('buildIdempotencyKey / buildMpPaymentBody / mapMpResponse', () => {
  it('monta X-Idempotency-Key estável', () => {
    expect(buildIdempotencyKey('pay-uuid')).toBe('fal-pay-pay-uuid')
  })

  it('method server = pix', () => {
    expect(serverPaymentMethod()).toBe('pix')
  })

  it('monta body MP com external_reference = order', () => {
    const body = buildMpPaymentBody({
      transactionAmount: 99.9,
      description: 'Pedido FAL',
      paymentMethodId: 'pix',
      externalReference: 'order-1',
      payer: { email: 'a@b.com', identificationType: 'CPF', identificationNumber: '123' },
    })
    expect(body.transaction_amount).toBe(99.9)
    expect(body.payment_method_id).toBe('pix')
    expect(body.external_reference).toBe('order-1')
  })

  it('MP approved → status interno pending + orderApproved false', () => {
    const fields = mapMpResponseToPaymentFields({
      id: 42,
      status: 'approved',
      payment_method_id: 'pix',
    })
    expect(fields.status).toBe('pending')
    expect(fields.provider_status).toBe('approved')
    expect(fields.orderApproved).toBe(false)
  })
})
