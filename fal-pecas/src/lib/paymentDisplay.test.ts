import { describe, expect, it } from 'vitest'
import {
  assertCardInstallmentsAllowed,
  falMaxInstallmentsForCheckout,
  filterInstallmentOptions,
  formatPaymentConditionLine,
  resolveInstallmentCount,
  type PaymentDisplaySettings,
} from './paymentDisplay'

const base: PaymentDisplaySettings = {
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
}

describe('paymentDisplay', () => {
  it('limita parcelas pela parcela mínima', () => {
    expect(resolveInstallmentCount(50, base)).toBe(2)
    expect(resolveInstallmentCount(200, base)).toBe(6)
  })

  it('não exibe se desligado ou 1x', () => {
    expect(formatPaymentConditionLine(15, base, 'card')).toBeNull()
    expect(formatPaymentConditionLine(100, { ...base, enabled: false }, 'card')).toBeNull()
    expect(formatPaymentConditionLine(100, { ...base, cardEnabled: false }, 'card')).toBeNull()
  })

  it('monta copy com juros', () => {
    const line = formatPaymentConditionLine(120, base, 'card')
    expect(line).toMatch(/em até 6x de/)
    expect(line).toMatch(/sem juros/)
  })

  it('checkout: parcelamento off → 1x; on → resolve', () => {
    expect(falMaxInstallmentsForCheckout(200, null)).toBe(1)
    expect(falMaxInstallmentsForCheckout(200, { ...base, installmentsEnabled: false })).toBe(1)
    expect(falMaxInstallmentsForCheckout(200, base)).toBe(6)
  })

  it('assert rejeita parcelas acima do teto', () => {
    expect(() => assertCardInstallmentsAllowed(6, 50, base)).toThrow(/acima/)
    expect(() => assertCardInstallmentsAllowed(2, 50, base)).not.toThrow()
    expect(() => assertCardInstallmentsAllowed(2, 50, null)).toThrow(/acima/)
  })

  it('assert rejeita cartão desativado', () => {
    expect(() =>
      assertCardInstallmentsAllowed(1, 100, { ...base, cardEnabled: false }),
    ).toThrow(/desativado/)
  })

  it('assert: juros off + freeMax 0 → só 1x', () => {
    const s = { ...base, allowInterestInstallments: false, interestFreeMax: 0 }
    expect(() => assertCardInstallmentsAllowed(1, 100, s)).not.toThrow()
    expect(() => assertCardInstallmentsAllowed(2, 100, s)).toThrow(/só 1x|juros/)
  })

  it('filtra opções MP por política (sem juros até 3x, sem com juros)', () => {
    const amount = 300
    const settings: PaymentDisplaySettings = {
      ...base,
      maxInstallments: 10,
      interestFreeMax: 3,
      allowInterestInstallments: false,
      minInstallmentAmount: 50,
    }
    const filtered = filterInstallmentOptions(amount, settings, [
      { installments: 1, installmentAmount: 300, totalAmount: 300, interestFree: true, label: '' },
      { installments: 2, installmentAmount: 150, totalAmount: 300, interestFree: true, label: '' },
      { installments: 3, installmentAmount: 100, totalAmount: 300, interestFree: true, label: '' },
      { installments: 6, installmentAmount: 55, totalAmount: 330, interestFree: false, label: '' },
      { installments: 12, installmentAmount: 30, totalAmount: 360, interestFree: false, label: '' },
    ])
    expect(filtered.map((o) => o.installments)).toEqual([1, 2, 3])
  })

  it('permite com juros quando allowInterestInstallments', () => {
    const amount = 300
    const filtered = filterInstallmentOptions(
      amount,
      { ...base, maxInstallments: 6, interestFreeMax: 1, allowInterestInstallments: true },
      [
        { installments: 1, installmentAmount: 300, totalAmount: 300, interestFree: true, label: '' },
        { installments: 6, installmentAmount: 55, totalAmount: 330, interestFree: false, label: '' },
      ],
    )
    expect(filtered.map((o) => o.installments)).toEqual([1, 6])
  })
})
