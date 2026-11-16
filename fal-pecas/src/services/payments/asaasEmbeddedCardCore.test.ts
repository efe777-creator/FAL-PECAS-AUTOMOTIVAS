import { describe, expect, it } from 'vitest'
import {
  attachCreditCardToAsaasCreateBody,
  buildAsaasPayWithCreditCardBody,
  parseAsaasEmbeddedCardClientBody,
  sanitizeAsaasCardErrorBody,
} from '../../../supabase/functions/_shared/asaasEmbeddedCardCore.ts'
import { buildAsaasPaymentCreateBody } from '../../../supabase/functions/_shared/asaasInstallmentsCore.ts'

const validCard = {
  holderName: 'EFE SILVA',
  number: '4111111111111111',
  expiryMonth: '12',
  expiryYear: '2030',
  ccv: '123',
}

const validHolder = {
  name: 'Efe Silva',
  email: 'efe@example.com',
  cpfCnpj: '52998224725',
  postalCode: '01310100',
  addressNumber: '100',
  phone: '11999999999',
}

describe('parseAsaasEmbeddedCardClientBody', () => {
  it('normaliza cartão e titular', () => {
    const parsed = parseAsaasEmbeddedCardClientBody({
      orderId: 'ord-1',
      installments: 3,
      creditCard: {
        holderName: '  EFE SILVA ',
        number: '4111 1111 1111 1111',
        expiryMonth: '3',
        expiryYear: '30',
        ccv: '123',
      },
      creditCardHolderInfo: {
        ...validHolder,
        cpfCnpj: '529.982.247-25',
        postalCode: '01310-100',
      },
    })
    expect(parsed.orderId).toBe('ord-1')
    expect(parsed.installments).toBe(3)
    expect(parsed.creditCard.number).toBe('4111111111111111')
    expect(parsed.creditCard.expiryMonth).toBe('03')
    expect(parsed.creditCard.expiryYear).toBe('2030')
    expect(parsed.creditCardHolderInfo.cpfCnpj).toBe('52998224725')
    expect(parsed.creditCardHolderInfo.postalCode).toBe('01310100')
  })

  it('rejeita installments inválidos', () => {
    expect(() =>
      parseAsaasEmbeddedCardClientBody({
        orderId: 'ord-1',
        installments: 99,
        creditCard: validCard,
        creditCardHolderInfo: validHolder,
      }),
    ).toThrow(/installments_invalido/)
  })
})

describe('attach / payWithCreditCard body', () => {
  it('anexa creditCard sem alterar Pix/invoice base além do necessário', () => {
    const base = buildAsaasPaymentCreateBody({
      customer: 'cus_1',
      billingType: 'CREDIT_CARD',
      amount: 150,
      dueDate: '2026-11-20',
      description: 'Pedido FAL',
      externalReference: 'ord-1',
      remoteIp: '203.0.113.10',
      installments: 1,
    })
    const attached = attachCreditCardToAsaasCreateBody(base, {
      creditCard: validCard,
      creditCardHolderInfo: validHolder,
      remoteIp: '203.0.113.10',
      callbackUrl: 'https://loja.example/checkout?asaas3ds=1',
    })
    expect(attached.billingType).toBe('CREDIT_CARD')
    expect(attached.value).toBe(150)
    expect(attached.creditCard).toEqual(validCard)
    expect(attached.threeDSecure).toEqual({
      callbackUrl: 'https://loja.example/checkout?asaas3ds=1',
    })
    // base original intacto (sem PAN)
    expect(base.creditCard).toBeUndefined()
  })

  it('payWithCreditCard não inclui value/billingType', () => {
    const body = buildAsaasPayWithCreditCardBody({
      creditCard: validCard,
      creditCardHolderInfo: validHolder,
      remoteIp: '203.0.113.10',
    })
    expect(body.creditCard).toEqual(validCard)
    expect(body).not.toHaveProperty('value')
    expect(body).not.toHaveProperty('billingType')
  })
})

describe('sanitizeAsaasCardErrorBody', () => {
  it('omite payload com número/ccv', () => {
    expect(
      sanitizeAsaasCardErrorBody({
        errors: [{ description: 'invalid', creditCard: { number: '4111', ccv: '123' } }],
      }),
    ).toEqual({ error: 'asaas_card_declined_or_invalid' })
  })

  it('mantém erro Asaas sem dados de cartão', () => {
    const err = {
      errors: [{ code: 'invalid_value', description: 'O valor mínimo é R$ 5,00.' }],
    }
    expect(sanitizeAsaasCardErrorBody(err)).toEqual(err)
  })
})
