import { describe, expect, it } from 'vitest'
import { cartItemsQuoteFingerprint } from '@/services/shipping/cartQuoteFingerprint'

describe('cartItemsQuoteFingerprint', () => {
  it('ordena linhas e inclui subtotal', () => {
    expect(
      cartItemsQuoteFingerprint(
        [
          { productId: 'b', quantity: 2 },
          { productId: 'a', quantity: 1 },
        ],
        100.5,
      ),
    ).toBe('a:1|b:2::100.50')
  })

  it('muda quando troca produto com mesmo count/subtotal', () => {
    const a = cartItemsQuoteFingerprint([{ productId: 'x', quantity: 1 }], 50)
    const b = cartItemsQuoteFingerprint([{ productId: 'y', quantity: 1 }], 50)
    expect(a).not.toBe(b)
  })

  it('muda quando muda quantidade', () => {
    const a = cartItemsQuoteFingerprint([{ productId: 'x', quantity: 1 }], 50)
    const b = cartItemsQuoteFingerprint([{ productId: 'x', quantity: 2 }], 50)
    expect(a).not.toBe(b)
  })
})
