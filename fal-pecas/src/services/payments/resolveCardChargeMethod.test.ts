import { describe, expect, it } from 'vitest'
import {
  detectBinCardKind,
  pickPaymentMethodForPreferred,
  resolveCardChargeMethod,
} from './resolveCardChargeMethod'

describe('resolveCardChargeMethod', () => {
  it('honra débito mesmo se BIN vier credit_card', () => {
    const r = resolveCardChargeMethod({
      preferred: 'debit_card',
      binPaymentTypeId: 'credit_card',
    })
    expect(r.method).toBe('debit_card')
    expect(r.binDetected).toBe('credit_card')
    expect(r.binMismatch).toBe(true)
  })

  it('honra crédito mesmo se BIN vier debit_card', () => {
    const r = resolveCardChargeMethod({
      preferred: 'credit_card',
      binPaymentTypeId: 'debit_card',
    })
    expect(r.method).toBe('credit_card')
    expect(r.binDetected).toBe('debit_card')
    expect(r.binMismatch).toBe(true)
  })

  it('sem mismatch quando BIN e preferência batem', () => {
    expect(
      resolveCardChargeMethod({
        preferred: 'debit_card',
        binPaymentTypeId: 'debit_card',
      }).binMismatch,
    ).toBe(false)
    expect(
      resolveCardChargeMethod({
        preferred: 'credit_card',
        binPaymentTypeId: 'credit_card',
      }).binMismatch,
    ).toBe(false)
  })

  it('BIN desconhecido não gera mismatch', () => {
    const r = resolveCardChargeMethod({
      preferred: 'debit_card',
      binPaymentTypeId: null,
    })
    expect(r.method).toBe('debit_card')
    expect(r.binDetected).toBe('unknown')
    expect(r.binMismatch).toBe(false)
  })
})

describe('detectBinCardKind / pickPaymentMethodForPreferred', () => {
  it('detecta debit e credit', () => {
    expect(detectBinCardKind('debit_card')).toBe('debit_card')
    expect(detectBinCardKind('credit_card')).toBe('credit_card')
    expect(detectBinCardKind('')).toBe('unknown')
  })

  it('prefere resultado do BIN alinhado ao canal', () => {
    const results = [
      { id: 'master', payment_type_id: 'credit_card' },
      { id: 'debmaster', payment_type_id: 'debit_card' },
    ]
    expect(pickPaymentMethodForPreferred(results, 'debit_card')?.id).toBe('debmaster')
    expect(pickPaymentMethodForPreferred(results, 'credit_card')?.id).toBe('master')
  })

  it('cai no primeiro se nenhum casar', () => {
    const results = [{ id: 'visa', payment_type_id: 'credit_card' }]
    expect(pickPaymentMethodForPreferred(results, 'debit_card')?.id).toBe('visa')
  })
})
