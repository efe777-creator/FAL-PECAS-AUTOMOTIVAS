import { describe, expect, it } from 'vitest'
import { paymentStatusLabel } from './paymentLabels'

describe('paymentStatusLabel', () => {
  it('traduz status conhecidos para PT-BR', () => {
    expect(paymentStatusLabel('pending')).toBe('pendente')
    expect(paymentStatusLabel('approved')).toBe('aprovado')
    expect(paymentStatusLabel('rejected')).toBe('recusado')
    expect(paymentStatusLabel('cancelled')).toBe('cancelado')
    expect(paymentStatusLabel('expired')).toBe('expirado')
    expect(paymentStatusLabel('in_process')).toBe('em análise')
  })

  it('é case-insensitive e trata vazio', () => {
    expect(paymentStatusLabel('EXPIRED')).toBe('expirado')
    expect(paymentStatusLabel(null)).toBe('—')
    expect(paymentStatusLabel('')).toBe('—')
  })
})
