import { enrichGatewaySandboxResult } from '@/services/payments/gatewaySandboxPaymentProvider'
import { resolvePaymentProviderKey } from '@/services/payments/paymentService'
import type { PaymentIntentResult } from '@/types'
import { describe, expect, it } from 'vitest'

describe('resolvePaymentProviderKey (F9-C)', () => {
  it('seleciona gateway para gateway|sandbox', () => {
    expect(resolvePaymentProviderKey('gateway')).toBe('gateway')
    expect(resolvePaymentProviderKey('SANDBOX')).toBe('gateway')
  })

  it('default simulated', () => {
    expect(resolvePaymentProviderKey(undefined)).toBe('simulated')
    expect(resolvePaymentProviderKey('simulated')).toBe('simulated')
    expect(resolvePaymentProviderKey('other')).toBe('simulated')
  })
})

describe('enrichGatewaySandboxResult (F9-C)', () => {
  it('marca metadata gateway_sandbox preservando provider simulated', () => {
    const base: PaymentIntentResult = {
      paymentId: 'pay-1',
      provider: 'simulated',
      status: 'pending',
      metadata: { foo: 1 },
    }
    const out = enrichGatewaySandboxResult(base, { method: 'pix_simulated' })
    expect(out.provider).toBe('simulated')
    expect(out.metadata?.mode).toBe('gateway_sandbox')
    expect(out.metadata?.gateway).toBe('fal_sandbox')
    expect(out.metadata?.foo).toBe(1)
    expect(out.metadata?.method).toBe('pix_simulated')
  })
})
