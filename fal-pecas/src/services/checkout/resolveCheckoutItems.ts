import type { CartItem } from '@/types'
import {
  buyNowIntentToCartItems,
  clearBuyNowIntent,
  loadBuyNowIntent,
} from '@/services/checkout/buyNowSession'

export type CheckoutNavState = {
  checkoutMode?: 'cart' | 'buyNow'
  from?: string
}

/**
 * Define itens do checkout: carrinho vs compra direta (C5).
 * Buy_now persistido na sessão não pode “sequestrar” o fluxo do carrinho.
 */
export function resolveCheckoutItems(
  cartItems: CartItem[],
  nav: CheckoutNavState | null | undefined,
): { items: CartItem[]; isBuyNow: boolean } {
  const mode = nav?.checkoutMode
  const fromCart = mode === 'cart' || nav?.from === '/carrinho'

  if (fromCart) {
    clearBuyNowIntent()
    return { items: cartItems, isBuyNow: false }
  }

  if (mode === 'buyNow') {
    const intent = loadBuyNowIntent()
    if (intent) {
      return { items: buyNowIntentToCartItems(intent), isBuyNow: true }
    }
    return { items: cartItems, isBuyNow: false }
  }

  if (cartItems.length > 0) {
    clearBuyNowIntent()
    return { items: cartItems, isBuyNow: false }
  }

  const intent = loadBuyNowIntent()
  if (intent) {
    return { items: buyNowIntentToCartItems(intent), isBuyNow: true }
  }
  return { items: cartItems, isBuyNow: false }
}