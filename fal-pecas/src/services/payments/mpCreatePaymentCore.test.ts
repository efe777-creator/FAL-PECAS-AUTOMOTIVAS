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
    expect(buildIdempotencyKey('pay-uuid', 2)).toBe('fal-pay-pay-uuid-a2')
  })

  it('method server = pix', () => {
    expect(serverPaymentMethod()).toBe('pix')
  })

  it('monta body MP com external_reference = order e CPF', () => {
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
    expect(body.payer).toMatchObject({
      email: 'a@b.com',
      identification: { type: 'CPF', number: '123' },
    })
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

  it('aceita cartão token sem amount', () => {
    expect(
      parseCreateMpPaymentClientBody({
        orderId: 'o1',
        token: 'tok',
        paymentMethodId: 'master',
        installments: 3,
      }),
    ).toMatchObject({
      orderId: 'o1',
      card: { token: 'tok', paymentMethodId: 'master', installments: 3 },
    })
  })

  it('monta body cartão com token', () => {
    const body = buildMpPaymentBody({
      transactionAmount: 50,
      description: 'Pedido',
      paymentMethodId: 'visa',
      externalReference: 'o1',
      payer: { email: 'a@b.com' },
      token: 'tok-1',
      installments: 2,
    })
    expect(body.token).toBe('tok-1')
    expect(body.installments).toBe(2)
    expect(body.payment_method_id).toBe('visa')
  })
})
