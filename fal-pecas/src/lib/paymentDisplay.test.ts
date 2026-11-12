import { describe, expect, it } from 'vitest'
import {
  assertCardInstallmentsAllowed,
  falMaxInstallmentsForCheckout,
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
  })

  it('monta copy com juros', () => {
    const line = formatPaymentConditionLine(120, base, 'card')
    expect(line).toMatch(/em até 6x de/)
    expect(line).toMatch(/sem juros/)
  })

  it('checkout: display off → 1x; on → resolve', () => {
    expect(falMaxInstallmentsForCheckout(200, null)).toBe(1)
    expect(falMaxInstallmentsForCheckout(200, { ...base, enabled: false })).toBe(1)
    expect(falMaxInstallmentsForCheckout(200, base)).toBe(6)
  })

  it('assert rejeita parcelas acima do teto', () => {
    expect(() => assertCardInstallmentsAllowed(6, 50, base)).toThrow(/acima/)
    expect(() => assertCardInstallmentsAllowed(2, 50, base)).not.toThrow()
    expect(() => assertCardInstallmentsAllowed(2, 50, null)).toThrow(/acima/)
  })
})
