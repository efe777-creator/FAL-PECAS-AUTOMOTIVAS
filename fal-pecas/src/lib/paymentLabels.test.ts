import { describe, expect, it } from 'vitest'
import {
  paymentMethodLabel,
  paymentProviderLabel,
  paymentStatusLabel,
} from './paymentLabels'

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

describe('paymentProviderLabel', () => {
  it('traduz provedores conhecidos', () => {
    expect(paymentProviderLabel('mercadopago')).toBe('Mercado Pago')
    expect(paymentProviderLabel('simulated')).toBe('Demonstração')
    expect(paymentProviderLabel(null)).toBe('—')
  })
})

describe('paymentMethodLabel', () => {
  it('traduz meios conhecidos', () => {
    expect(paymentMethodLabel('pix')).toBe('Pix')
    expect(paymentMethodLabel('credit_card')).toBe('Cartão')
    expect(paymentMethodLabel('pix_simulated')).toBe('Pix (demonstração)')
  })
})
