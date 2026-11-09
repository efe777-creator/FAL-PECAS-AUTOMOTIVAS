import { describe, expect, it } from 'vitest'
import {
  isTerminalFalStatus,
  mapProviderStatusToFal,
  toPersistedPaymentStatus,
} from '@/services/payments/engine/paymentStatuses'

describe('paymentStatuses PG07', () => {
  it('persiste authorized/in_process como pending', () => {
    expect(toPersistedPaymentStatus('authorized')).toBe('pending')
    expect(toPersistedPaymentStatus('in_process')).toBe('pending')
    expect(toPersistedPaymentStatus('partially_refunded')).toBe('refunded')
    expect(toPersistedPaymentStatus('approved')).toBe('approved')
  })

  it('mapeia status Mercado Pago', () => {
    expect(mapProviderStatusToFal('mercadopago', 'approved')).toBe('approved')
    expect(mapProviderStatusToFal('mercadopago', 'authorized')).toBe('authorized')
    expect(mapProviderStatusToFal('mp', 'in_process')).toBe('in_process')
    expect(mapProviderStatusToFal('mercadopago', 'pending_contingency')).toBe('pending')
  })

  it('terminal', () => {
    expect(isTerminalFalStatus('approved')).toBe(true)
    expect(isTerminalFalStatus('pending')).toBe(false)
  })
})
