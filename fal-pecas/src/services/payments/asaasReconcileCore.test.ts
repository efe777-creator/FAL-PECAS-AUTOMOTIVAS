import { describe, expect, it } from 'vitest'
import {
  asaasListPaymentsPath,
  isCreatingLockActive,
  pickReconcileCandidate,
  readChargePhase,
  withChargePhase,
} from '../../../supabase/functions/_shared/asaasReconcileCore.ts'
import {
  ASAAS_DEFAULT_TIMEOUT_MS,
  isAsaasInconclusive,
  type AsaasApiResult,
} from '../../../supabase/functions/_shared/asaasApiCore.ts'

describe('asaasReconcileCore', () => {
  it('lista por externalReference com path estável', () => {
    expect(asaasListPaymentsPath('ord-1')).toBe(
      '/payments?externalReference=ord-1&limit=20',
    )
  })

  it('escolhe PENDING alinhado a valor e billingType', () => {
    const picked = pickReconcileCandidate(
      [
        { id: 'pay_old', status: 'REFUNDED', value: 100, billingType: 'CREDIT_CARD' },
        { id: 'pay_ok', status: 'PENDING', value: 250.5, billingType: 'CREDIT_CARD' },
        { id: 'pay_other', status: 'PENDING', value: 10, billingType: 'CREDIT_CARD' },
      ],
      { amount: 250.5, billingType: 'CREDIT_CARD' },
    )
    expect(picked?.id).toBe('pay_ok')
  })

  it('respeita installmentCount no cartão parcelado', () => {
    const picked = pickReconcileCandidate(
      [
        {
          id: 'pay_1x',
          status: 'PENDING',
          value: 300,
          billingType: 'CREDIT_CARD',
          installmentCount: 1,
        },
        {
          id: 'pay_3x',
          status: 'PENDING',
          totalValue: 300,
          billingType: 'CREDIT_CARD',
          installmentCount: 3,
        },
      ],
      { amount: 300, billingType: 'CREDIT_CARD', installments: 3 },
    )
    expect(picked?.id).toBe('pay_3x')
  })

  it('ignora deleted', () => {
    expect(
      pickReconcileCandidate(
        [{ id: 'pay_x', status: 'PENDING', value: 50, billingType: 'PIX', deleted: true }],
        { amount: 50, billingType: 'PIX' },
      ),
    ).toBeNull()
  })

  it('charge_phase + lock creating', () => {
    const meta = withChargePhase({ routing: { v: 1 } }, 'creating')
    expect(readChargePhase(meta)).toBe('creating')
    expect(isCreatingLockActive(meta, new Date())).toBe(true)

    const stale = {
      ...meta,
      charge_phase_at: new Date(Date.now() - 60_000).toISOString(),
    }
    expect(isCreatingLockActive(stale, new Date())).toBe(false)

    expect(readChargePhase(withChargePhase({}, 'inconclusive'))).toBe('inconclusive')
  })
})

describe('asaasApiCore inconclusive tipagem', () => {
  it('expõe timeout padrão operacional', () => {
    expect(ASAAS_DEFAULT_TIMEOUT_MS).toBe(20_000)
  })

  it('isAsaasInconclusive só em falha tipada', () => {
    const timeout: AsaasApiResult = {
      ok: false,
      status: 0,
      body: { error: 'asaas_timeout' },
      inconclusive: true,
    }
    const hard: AsaasApiResult = {
      ok: false,
      status: 400,
      body: { errors: [] },
      inconclusive: false,
    }
    const ok: AsaasApiResult<{ id: string }> = { ok: true, data: { id: '1' }, status: 200 }
    expect(isAsaasInconclusive(timeout)).toBe(true)
    expect(isAsaasInconclusive(hard)).toBe(false)
    expect(isAsaasInconclusive(ok)).toBe(false)
  })
})
