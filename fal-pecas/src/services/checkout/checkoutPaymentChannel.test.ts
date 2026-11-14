import { describe, expect, it } from 'vitest'
import {
  defaultCardChannel,
  isCardMpChannel,
  normalizeMpChannel,
  resolveSelectableChannel,
} from './checkoutPaymentChannel'

describe('checkoutPaymentChannel', () => {
  it('normaliza legado card e strings inválidas', () => {
    expect(normalizeMpChannel('credit_card')).toBe('credit_card')
    expect(normalizeMpChannel('debit_card')).toBe('debit_card')
    expect(normalizeMpChannel('pix')).toBe('pix')
    expect(normalizeMpChannel('card')).toBe('credit_card')
    expect(normalizeMpChannel('CARD')).toBe('credit_card')
    expect(normalizeMpChannel(null)).toBe('pix')
    expect(normalizeMpChannel('boleto')).toBe('pix')
  })

  it('escolhe canal de cartão padrão sem estado stale', () => {
    expect(defaultCardChannel({ credit: true, debit: true })).toBe('credit_card')
    expect(defaultCardChannel({ credit: false, debit: true })).toBe('debit_card')
    expect(defaultCardChannel({ credit: false, debit: false })).toBe('credit_card')
  })

  it('resolve seleção respeitando disponibilidade', () => {
    const avail = { pix: true, credit: true, debit: true, card: true }
    expect(resolveSelectableChannel('debit_card', avail)).toBe('debit_card')
    expect(resolveSelectableChannel('credit_card', { ...avail, credit: false })).toBe(
      'debit_card',
    )
    expect(resolveSelectableChannel('pix', { ...avail, pix: false })).toBe('credit_card')
    expect(
      resolveSelectableChannel('debit_card', {
        pix: false,
        credit: false,
        debit: false,
        card: false,
      }),
    ).toBe('pix')
  })

  it('identifica canais de cartão', () => {
    expect(isCardMpChannel('credit_card')).toBe(true)
    expect(isCardMpChannel('debit_card')).toBe(true)
    expect(isCardMpChannel('pix')).toBe(false)
  })
})
