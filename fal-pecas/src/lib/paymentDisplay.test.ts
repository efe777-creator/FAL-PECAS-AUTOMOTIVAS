import { describe, expect, it } from 'vitest'
import {
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
})
