import { executeCreateMpPayment, type CreateMpFlowDeps } from '@/services/payments/createMpPaymentFlow'
import {
  buildIdempotencyKey,
  parseCreateMpPaymentClientBody,
  serverPaymentMethod,
} from '@/services/payments/mpCreatePaymentCore'
import { describe, expect, it, vi } from 'vitest'

const displayOn6 = {
  id: '1',
  enabled: true,
  maxInstallments: 6,
  minInstallmentAmount: 20,
  interestFree: true,
  interestFreeMax: 6,
  allowInterestInstallments: false,
  installmentsEnabled: true,
  cardEnabled: true,
  pixEnabled: true,
  showOnCards: true,
  showOnPdp: true,
  footnote: null,
} as const

function baseDeps(over: Partial<CreateMpFlowDeps> = {}): CreateMpFlowDeps {
  return {
    mpAccessToken: 'TEST-TOKEN',
    authUser: { id: 'user-1', email: 'a@b.com' },
    findCustomerId: async () => 'cust-1',
    findOrder: async () => ({
      id: 'ord-1',
      status: 'aguardando_pagamento',
      total: 150.5,
    }),
    findPendingPayment: async () => null,
    updatePayment: async () => {},
    insertPayment: async () => 'pay-new',
    findProfileName: async () => 'Joao Silva',
    confirmPayment: async () => {},
    getPaymentDisplay: async () => ({ ...displayOn6 }),
    fetchMp: async () => ({
      ok: true,
      status: 201,
      json: async () => ({
        id: 999,
        status: 'pending',
        payment_method_id: 'pix',
        point_of_interaction: {
          transaction_data: { qr_code: '000201' },
        },
      }),
    }),
    ...over,
  }
}

describe('parseCreateMpPaymentClientBody — só orderId', () => {
  it('aceita somente orderId', () => {
    expect(parseCreateMpPaymentClientBody({ orderId: ' o1 ' })).toEqual({ orderId: 'o1' })
  })

  it('rejeita amount', () => {
    expect(() => parseCreateMpPaymentClientBody({ orderId: 'o1', amount: 9 })).toThrow(/amount/)
  })

  it('rejeita method do FE', () => {
    expect(() =>
      parseCreateMpPaymentClientBody({ orderId: 'o1', method: 'credit_card' }),
    ).toThrow(/method/)
  })

  it('serverPaymentMethod = pix', () => {
    expect(serverPaymentMethod()).toBe('pix')
  })
})

describe('executeCreateMpPayment — casos A–I', () => {
  it('A: order válido → chama MP com amount do banco', async () => {
    const fetchMp = vi.fn(async (_url: string, init: RequestInit) => {
      const body = JSON.parse(String(init.body))
      expect(body.transaction_amount).toBe(150.5)
      expect(body.external_reference).toBe('ord-1')
      expect(body.payment_method_id).toBe('pix')
      expect((init.headers as Record<string, string>)['X-Idempotency-Key']).toBe(
        buildIdempotencyKey('pay-new'),
      )
      return {
        ok: true,
        status: 201,
        json: async () => ({ id: 1, status: 'pending', payment_method_id: 'pix' }),
      }
    })
    const res = await executeCreateMpPayment({ orderId: 'ord-1' }, baseDeps({ fetchMp }))
    expect(res.httpStatus).toBe(201)
    expect(res.body.status).toBe('pending')
    expect(res.body.orderApproved).toBe(false)
    expect(fetchMp).toHaveBeenCalled()
  })

  it('B: amount no body → rejeitado (banco prevalece via rejeição)', async () => {
    const fetchMp = vi.fn()
    const res = await executeCreateMpPayment(
      { orderId: 'ord-1', amount: 1 },
      baseDeps({ fetchMp }),
    )
    expect(res.httpStatus).toBe(400)
    expect(String(res.body.error)).toMatch(/amount/)
    expect(fetchMp).not.toHaveBeenCalled()
  })

  it('C: pedido de outro usuário → 404', async () => {
    const res = await executeCreateMpPayment(
      { orderId: 'ord-x' },
      baseDeps({ findOrder: async () => null }),
    )
    expect(res.httpStatus).toBe(404)
  })

  it('D: status ≠ aguardando_pagamento → 409', async () => {
    const res = await executeCreateMpPayment(
      { orderId: 'ord-1' },
      baseDeps({
        findOrder: async () => ({ id: 'ord-1', status: 'em_analise', total: 10 }),
      }),
    )
    expect(res.httpStatus).toBe(409)
  })

  it('E: MP_ACCESS_TOKEN ausente', async () => {
    const res = await executeCreateMpPayment(
      { orderId: 'ord-1' },
      baseDeps({ mpAccessToken: undefined }),
    )
    expect(res.httpStatus).toBe(503)
    expect(res.body.error).toBe('MP_ACCESS_TOKEN missing')
  })

  it('F: MP erro → não approved interno', async () => {
    const updates: Record<string, unknown>[] = []
    const res = await executeCreateMpPayment(
      { orderId: 'ord-1' },
      baseDeps({
        updatePayment: async (_id, patch) => {
          updates.push(patch)
        },
        fetchMp: async () => ({
          ok: false,
          status: 400,
          json: async () => ({ message: 'bad' }),
        }),
      }),
    )
    expect(res.httpStatus).toBe(502)
    expect(res.body.orderApproved).toBe(false)
    expect(updates.some((u) => u.status === 'approved')).toBe(false)
  })

  it('G: MP approved síncrono → confirmPayment + orderApproved', async () => {
    const updates: Record<string, unknown>[] = []
    const confirmPayment = vi.fn(async () => {})
    const res = await executeCreateMpPayment(
      { orderId: 'ord-1' },
      baseDeps({
        updatePayment: async (_id, patch) => {
          updates.push(patch)
        },
        confirmPayment,
        fetchMp: async () => ({
          ok: true,
          status: 201,
          json: async () => ({ id: 77, status: 'approved', payment_method_id: 'visa' }),
        }),
      }),
    )
    expect(res.httpStatus).toBe(201)
    expect(res.body.status).toBe('approved')
    expect(res.body.providerStatus).toBe('approved')
    expect(res.body.orderApproved).toBe(true)
    expect(confirmPayment).toHaveBeenCalledWith('pay-new')
    expect(updates.some((u) => u.provider_status === 'approved')).toBe(true)
  })

  it('P0: installments acima da política → 422', async () => {
    const fetchMp = vi.fn()
    const res = await executeCreateMpPayment(
      {
        orderId: 'ord-1',
        token: 'tok',
        paymentMethodId: 'visa',
        installments: 6,
      },
      baseDeps({
        fetchMp,
        getPaymentDisplay: async () => ({
          id: '1',
          enabled: true,
          maxInstallments: 3,
          minInstallmentAmount: 20,
          interestFree: true,
          interestFreeMax: 3,
          allowInterestInstallments: false,
          installmentsEnabled: true,
          cardEnabled: true,
          pixEnabled: true,
          showOnCards: true,
          showOnPdp: true,
          footnote: null,
        }),
      }),
    )
    expect(res.httpStatus).toBe(422)
    expect(res.body.error).toBe('installments_not_allowed')
    expect(fetchMp).not.toHaveBeenCalled()
  })

  it('G2: MP rejected síncrono (cartão) → status rejected sem confirm', async () => {
    const updates: Record<string, unknown>[] = []
    const confirmPayment = vi.fn(async () => {})
    const res = await executeCreateMpPayment(
      {
        orderId: 'ord-1',
        token: 'tok',
        paymentMethodId: 'visa',
        installments: 1,
      },
      baseDeps({
        updatePayment: async (_id, patch) => {
          updates.push(patch)
        },
        confirmPayment,
        fetchMp: async () => ({
          ok: true,
          status: 201,
          json: async () => ({ id: 78, status: 'rejected', payment_method_id: 'visa' }),
        }),
      }),
    )
    expect(res.httpStatus).toBe(201)
    expect(res.body.status).toBe('rejected')
    expect(res.body.orderApproved).toBe(false)
    expect(confirmPayment).not.toHaveBeenCalled()
    expect(updates.some((u) => u.status === 'rejected')).toBe(true)
  })

  it('G3: MP pending (Pix aguardando) → pending sem confirm', async () => {
    const confirmPayment = vi.fn(async () => {})
    const res = await executeCreateMpPayment(
      { orderId: 'ord-1' },
      baseDeps({ confirmPayment }),
    )
    expect(res.httpStatus).toBe(201)
    expect(res.body.status).toBe('pending')
    expect(res.body.orderApproved).toBe(false)
    expect(confirmPayment).not.toHaveBeenCalled()
  })

  it('H: pending com provider_payment_id → reutiliza', async () => {
    const fetchMp = vi.fn()
    const insertPayment = vi.fn()
    const res = await executeCreateMpPayment(
      { orderId: 'ord-1' },
      baseDeps({
        findPendingPayment: async () => ({
          id: 'pay-old',
          provider_payment_id: 'mp-1',
          method: 'pix',
        }),
        fetchMp,
        insertPayment,
      }),
    )
    expect(res.httpStatus).toBe(200)
    expect(res.body.reused).toBe(true)
    expect(fetchMp).not.toHaveBeenCalled()
    expect(insertPayment).not.toHaveBeenCalled()
  })

  it('H2: pending Pix + pedido cartão → cancela e cria novo', async () => {
    const updates: Record<string, unknown>[] = []
    const fetchMp = vi.fn(async () => ({
      ok: true,
      status: 201,
      json: async () => ({ id: 88, status: 'pending', payment_method_id: 'visa' }),
    }))
    const res = await executeCreateMpPayment(
      {
        orderId: 'ord-1',
        token: 'tok',
        paymentMethodId: 'visa',
        installments: 3,
      },
      baseDeps({
        findPendingPayment: async () => ({
          id: 'pay-pix',
          provider_payment_id: 'mp-pix',
          method: 'pix',
        }),
        updatePayment: async (_id, patch) => {
          updates.push(patch)
        },
        insertPayment: async () => 'pay-card',
        fetchMp,
      }),
    )
    expect(res.body.reused).not.toBe(true)
    expect(updates.some((u) => u.status === 'cancelled')).toBe(true)
    expect(fetchMp).toHaveBeenCalled()
    expect(res.httpStatus).toBe(201)
  })

  it('I: X-Idempotency-Key estável fal-pay-{paymentId}', async () => {
    const keys: string[] = []
    await executeCreateMpPayment(
      { orderId: 'ord-1' },
      baseDeps({
        insertPayment: async () => 'pay-stable',
        fetchMp: async (_u, init) => {
          keys.push((init.headers as Record<string, string>)['X-Idempotency-Key'])
          return {
            ok: true,
            status: 201,
            json: async () => ({ id: 2, status: 'pending' }),
          }
        },
      }),
    )
    expect(keys[0]).toBe('fal-pay-pay-stable')
  })

  it('J: cartão envia token e amount do banco', async () => {
    const fetchMp = vi.fn(async (_url: string, init: RequestInit) => {
      const body = JSON.parse(String(init.body))
      expect(body.transaction_amount).toBe(150.5)
      expect(body.token).toBe('card-tok')
      expect(body.payment_method_id).toBe('master')
      expect(body.installments).toBe(3)
      return {
        ok: true,
        status: 201,
        json: async () => ({ id: 55, status: 'pending', payment_method_id: 'master' }),
      }
    })
    const res = await executeCreateMpPayment(
      {
        orderId: 'ord-1',
        token: 'card-tok',
        paymentMethodId: 'master',
        installments: 3,
        paymentTypeId: 'credit_card',
      },
      baseDeps({ fetchMp }),
    )
    expect(res.httpStatus).toBe(201)
    expect(res.body.method).toBe('credit_card')
    expect(res.body.orderApproved).toBe(false)
  })

  it('unauthorized sem user', async () => {
    const res = await executeCreateMpPayment(
      { orderId: 'ord-1' },
      baseDeps({ authUser: null }),
    )
    expect(res.httpStatus).toBe(401)
  })
})
