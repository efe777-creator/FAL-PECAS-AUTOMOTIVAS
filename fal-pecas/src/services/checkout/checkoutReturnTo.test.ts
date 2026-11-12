import { describe, expect, it } from 'vitest'
import {
  checkoutBackLabel,
  safeCheckoutReturnTo,
} from './checkoutReturnTo'

describe('checkoutReturnTo', () => {
  it('aceita produto, carrinho e catálogo', () => {
    expect(safeCheckoutReturnTo('/produto/peca-abc')).toBe('/produto/peca-abc')
    expect(safeCheckoutReturnTo('/carrinho')).toBe('/carrinho')
    expect(safeCheckoutReturnTo('/catalogo?q=1')).toBe('/catalogo?q=1')
  })

  it('bloqueia externo, checkout e auth', () => {
    expect(safeCheckoutReturnTo('https://evil.com')).toBeNull()
    expect(safeCheckoutReturnTo('//evil.com')).toBeNull()
    expect(safeCheckoutReturnTo('/checkout')).toBeNull()
    expect(safeCheckoutReturnTo('/login')).toBeNull()
  })

  it('label conforme origem', () => {
    expect(checkoutBackLabel('/produto/x', true)).toBe('Voltar ao produto')
    expect(checkoutBackLabel('/carrinho', false)).toBe('Voltar ao carrinho')
    expect(checkoutBackLabel(null, false)).toBe('Voltar ao carrinho')
  })
})
