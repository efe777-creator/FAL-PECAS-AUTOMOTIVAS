import { describe, expect, it } from 'vitest'
import { buildAsaasPaymentCreateBody } from '../../../supabase/functions/_shared/asaasInstallmentsCore.ts'

describe('buildAsaasPaymentCreateBody (docs.asaas.com)', () => {
  const base = {
    customer: 'cus_1',
    amount: 201.5,
    dueDate: '2026-11-20',
    description: 'Pedido FAL x',
    externalReference: 'order-1',
    remoteIp: '203.0.113.10',
  }

  it('Pix: só value (sem installment*)', () => {
    const body = buildAsaasPaymentCreateBody({ ...base, billingType: 'PIX', installments: 3 })
    expect(body).toMatchObject({
      billingType: 'PIX',
      value: 201.5,
      customer: 'cus_1',
    })
    expect(body.installmentCount).toBeUndefined()
    expect(body.totalValue).toBeUndefined()
  })

  it('Cartão 1x: só value (avulso)', () => {
    const body = buildAsaasPaymentCreateBody({
      ...base,
      billingType: 'CREDIT_CARD',
      installments: 1,
    })
    expect(body.value).toBe(201.5)
    expect(body.installmentCount).toBeUndefined()
    expect(body.totalValue).toBeUndefined()
  })

  it('Cartão Nx: installmentCount + totalValue (sem value)', () => {
    const body = buildAsaasPaymentCreateBody({
      ...base,
      billingType: 'CREDIT_CARD',
      installments: 3,
    })
    expect(body.installmentCount).toBe(3)
    expect(body.totalValue).toBe(201.5)
    expect(body.value).toBeUndefined()
  })
})
