import { describe, expect, it } from 'vitest'
import {
  alignPaymentMethodIdForPreferred,
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

describe('alignPaymentMethodIdForPreferred', () => {
  it('mapeia visa/master → debvisa/debmaster no canal débito', () => {
    expect(alignPaymentMethodIdForPreferred('debit_card', 'visa')).toEqual({
      paymentMethodId: 'debvisa',
      remapped: true,
    })
    expect(alignPaymentMethodIdForPreferred('debit_card', 'master')).toEqual({
      paymentMethodId: 'debmaster',
      remapped: true,
    })
  })

  it('não remapeia se já for débito', () => {
    expect(alignPaymentMethodIdForPreferred('debit_card', 'debvisa')).toEqual({
      paymentMethodId: 'debvisa',
      remapped: false,
    })
  })

  it('no crédito remapeia debvisa → visa e preserva master', () => {
    expect(alignPaymentMethodIdForPreferred('credit_card', 'debvisa')).toEqual({
      paymentMethodId: 'visa',
      remapped: true,
    })
    expect(alignPaymentMethodIdForPreferred('credit_card', 'master')).toEqual({
      paymentMethodId: 'master',
      remapped: false,
    })
  })
})
