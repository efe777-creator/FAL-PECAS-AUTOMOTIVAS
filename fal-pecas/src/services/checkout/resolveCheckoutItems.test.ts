import { describe, expect, it, beforeEach } from 'vitest'
import type { CartItem } from '@/types'
import { clearBuyNowIntent, saveBuyNowIntent } from './buyNowSession'
import { resolveCheckoutItems } from './resolveCheckoutItems'

const product = {
  id: 'prod-bn',
  slug: 'peca-teste',
  sku: 'SKU-1',
  name: 'Peça teste',
  price: 50,
  available: true,
}

const cartLine: CartItem = {
  productId: 'prod-cart',
  sku: 'SKU-C',
  name: 'Do carrinho',
  price: 10,
  quantity: 2,
}

describe('resolveCheckoutItems', () => {
  beforeEach(() => {
    clearBuyNowIntent()
  })

  it('prioriza carrinho quando checkoutMode=cart', () => {
    saveBuyNowIntent(product, 1)
    const { items, isBuyNow } = resolveCheckoutItems([cartLine], {
      checkoutMode: 'cart',
      from: '/carrinho',
    })
    expect(isBuyNow).toBe(false)
    expect(items).toEqual([cartLine])
  })

  it('usa buy_now com checkoutMode=buyNow', () => {
    saveBuyNowIntent(product, 3)
    const { items, isBuyNow } = resolveCheckoutItems([cartLine], {
      checkoutMode: 'buyNow',
    })
    expect(isBuyNow).toBe(true)
    expect(items).toHaveLength(1)
    expect(items[0]?.productId).toBe('prod-bn')
    expect(items[0]?.quantity).toBe(3)
  })

  it('carrinho com itens vence buy_now antigo na sessão', () => {
    saveBuyNowIntent(product, 1)
    const { items, isBuyNow } = resolveCheckoutItems([cartLine], null)
    expect(isBuyNow).toBe(false)
    expect(items).toEqual([cartLine])
  })
})