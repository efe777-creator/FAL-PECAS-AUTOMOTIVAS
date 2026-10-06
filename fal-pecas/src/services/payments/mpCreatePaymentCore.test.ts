import {
  buildIdempotencyKey,
  buildMpPaymentBody,
  mapMpResponseToPaymentFields,
  parseCreateMpPaymentClientBody,
} from '@/services/payments/mpCreatePaymentCore'
import { describe, expect, it } from 'vitest'

describe('parseCreateMpPaymentClientBody (F9-B)', () => {
  it('aceita orderId e method default pix', () => {
    expect(parseCreateMpPaymentClientBody({ orderId: ' ord-1 ' })).toEqual({
      orderId: 'ord-1',
      method: 'pix',
    })
  })

  it('rejeita amount do client', () => {
    expect(() =>
      parseCreateMpPaymentClientBody({ orderId: 'o1', amount: 10 }),
    ).toThrow(/amount/)
  })

  it('exige orderId', () => {
    expect(() => parseCreateMpPaymentClientBody({})).toThrow(/orderId/)
  })
})

describe('buildIdempotencyKey / buildMpPaymentBody / mapMpResponse', () => {
  it('monta X-Idempotency-Key estável', () => {
    expect(buildIdempotencyKey('pay-uuid')).toBe('fal-pay-pay-uuid')
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

  it('mapeia qr e mantém status pending interno', () => {
    const fields = mapMpResponseToPaymentFields({
      id: 42,
      status: 'pending',
      payment_method_id: 'pix',
      point_of_interaction: {
        transaction_data: { qr_code: '000201', qr_code_base64: 'abc', ticket_url: 'https://t' },
      },
      date_of_expiration: '2026-10-07T00:00:00.000-03:00',
    })
    expect(fields.status).toBe('pending')
    expect(fields.provider_payment_id).toBe('42')
    expect(fields.pix_qr_code).toBe('000201')
  })
})
