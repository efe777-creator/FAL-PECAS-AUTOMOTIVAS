import { describe, expect, it } from 'vitest'
import { showCheckoutEmptyCart } from './checkoutEmptyGuard'

describe('showCheckoutEmptyCart (FIND-SMOKE-UI-001)', () => {
  it('mostra empty quando carrinho vazio e sem awaiting MP', () => {
    expect(showCheckoutEmptyCart(0, false)).toBe(true)
  })

  it('NÃO mostra empty quando awaiting Pix/Brick (carrinho já limpo)', () => {
    expect(showCheckoutEmptyCart(0, true)).toBe(false)
  })

  it('não mostra empty com itens no carrinho', () => {
    expect(showCheckoutEmptyCart(2, false)).toBe(false)
    expect(showCheckoutEmptyCart(1, true)).toBe(false)
  })

  it('não mostra empty com buy_now sem carrinho', () => {
    expect(showCheckoutEmptyCart(0, false, true)).toBe(false)
  })
})
