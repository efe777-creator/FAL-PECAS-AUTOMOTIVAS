import { describe, expect, it } from 'vitest'
import {
  applyPaymentCondition,
  formatPaymentAdjustLine,
  formatPixConditionLine,
  storefrontPrimaryAmount,
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
  creditEnabled: true,
  debitEnabled: true,
  pixEnabled: true,
  showOnCards: true,
  showOnPdp: true,
  footnote: null,
  pixAdjustPercent: -5,
  debitAdjustPercent: 0,
  creditAdjustPercent: 0,
}

describe('applyPaymentCondition', () => {
  it('aplica % Pix sobre preço resolvido (lista padrão ou promo)', () => {
    const r = applyPaymentCondition(100, 'pix', base)
    expect(r.amount).toBe(95)
    expect(r.baseAmount).toBe(100)
    expect(r.adjustPercent).toBe(-5)
  })

  it('mesma % sobre base promo (80 → 76)', () => {
    expect(applyPaymentCondition(80, 'pix', base).amount).toBe(76)
  })

  it('crédito 0% mantém base', () => {
    expect(applyPaymentCondition(100, 'credit_card', base).amount).toBe(100)
  })
})

describe('storefrontPrimaryAmount', () => {
  it('prioriza Pix quando ligado', () => {
    expect(storefrontPrimaryAmount(100, base).method).toBe('pix')
    expect(storefrontPrimaryAmount(100, base).amount).toBe(95)
  })

  it('sem Pix usa crédito', () => {
    const s = { ...base, pixEnabled: false, creditAdjustPercent: 0 }
    expect(storefrontPrimaryAmount(100, s).method).toBe('credit_card')
    expect(storefrontPrimaryAmount(100, s).amount).toBe(100)
  })
})

describe('formatPixConditionLine', () => {
  it('mostra valor e %', () => {
    expect(formatPixConditionLine(100, base)).toMatch(/Pix/)
    expect(formatPixConditionLine(100, base)).toMatch(/-5%/)
  })
})

describe('formatPaymentAdjustLine', () => {
  it('null sem ajuste', () => {
    expect(formatPaymentAdjustLine(applyPaymentCondition(100, 'credit_card', base))).toBeNull()
  })
  it('desconto Pix', () => {
    expect(formatPaymentAdjustLine(applyPaymentCondition(100, 'pix', base))).toMatch(/Pix/)
    expect(formatPaymentAdjustLine(applyPaymentCondition(100, 'pix', base))).toMatch(/-5%/)
  })
})
