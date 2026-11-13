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

  it('checkout: juros off capa teto em interestFreeMax (vitrine = checkout)', () => {
    const s = {
      ...base,
      maxInstallments: 10,
      interestFreeMax: 3,
      allowInterestInstallments: false,
      minInstallmentAmount: 20,
    }
    expect(falMaxInstallmentsForCheckout(300, s)).toBe(3)
    expect(formatPaymentConditionLine(300, s, 'pdp')).toMatch(/em até 3x/)
    expect(falMaxInstallmentsForCheckout(300, { ...s, interestFreeMax: 0 })).toBe(1)
  })

  it('assert com option free acima do freeMax → rejeita', () => {
    const s = { ...base, allowInterestInstallments: false, interestFreeMax: 2, maxInstallments: 6 }
    // teto efetivo já é 2 via falMax → rejeita 3x
    expect(() =>
      assertCardInstallmentsAllowed(3, 300, s, {
        installmentAmount: 100,
        totalAmount: 300,
        interestFree: true,
      }),
    ).toThrow(/acima do permitido|sem juros só até 2x/)
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
    expect(() => assertCardInstallmentsAllowed(2, 100, s)).toThrow(/só 1x|juros|acima do permitido/)
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
    expect(filtered[0]?.label).toMatch(/À vista no cartão/)
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

  it('sempre inclui à vista (1x) mesmo se MP omitir', () => {
    const amount = 120
    const filtered = filterInstallmentOptions(amount, base, [
      { installments: 2, installmentAmount: 60, totalAmount: 120, interestFree: true, label: '' },
      { installments: 3, installmentAmount: 40, totalAmount: 120, interestFree: true, label: '' },
    ])
    expect(filtered.map((o) => o.installments)).toEqual([1, 2, 3])
    expect(filtered[0]?.label).toMatch(/À vista no cartão/)
  })

  it('lista vazia do MP → só à vista', () => {
    const filtered = filterInstallmentOptions(66.74, base, [])
    expect(filtered.map((o) => o.installments)).toEqual([1])
  })

  it('juros off + freeMax 2 → corta 3x mesmo sem juros do MP', () => {
    const amount = 300
    const filtered = filterInstallmentOptions(
      amount,
      { ...base, maxInstallments: 6, interestFreeMax: 2, allowInterestInstallments: false },
      [
        { installments: 1, installmentAmount: 300, totalAmount: 300, interestFree: true, label: '' },
        { installments: 2, installmentAmount: 150, totalAmount: 300, interestFree: true, label: '' },
        { installments: 3, installmentAmount: 100, totalAmount: 300, interestFree: true, label: '' },
      ],
    )
    expect(filtered.map((o) => o.installments)).toEqual([1, 2])
  })
})
