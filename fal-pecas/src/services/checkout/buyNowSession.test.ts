import { afterEach, describe, expect, it } from 'vitest'
import {
  buyNowIntentToCartItems,
  clearBuyNowIntent,
  loadBuyNowIntent,
  saveBuyNowIntent,
} from './buyNowSession'
import {
  clearCheckoutSession,
  loadCheckoutSession,
  saveCheckoutSession,
} from './checkoutSession'
import type { Product } from '@/types'

afterEach(() => {
  clearBuyNowIntent()
  clearCheckoutSession()
})

const product = {
  id: 'prod-1',
  name: 'Filtro',
  sku: 'SKU-1',
  price: 49.9,
  imageUrl: '/a.jpg',
} as Product

describe('buyNowSession (C5)', () => {
  it('salva snapshot isolado e converte para itens de checkout', () => {
    saveBuyNowIntent(product, 2)
    const intent = loadBuyNowIntent()
    expect(intent?.productId).toBe('prod-1')
    expect(intent?.quantity).toBe(2)
    const items = buyNowIntentToCartItems(intent!)
    expect(items).toHaveLength(1)
    expect(items[0].quantity).toBe(2)
  })

  it('ao comprar agora limpa sessão de cobrança antiga', () => {
    saveCheckoutSession({
      orderId: 'old-order',
      paymentId: 'old-pay',
      idempotencyKey: 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
      channel: 'pix',
      amount: 1,
    })
    expect(loadCheckoutSession()?.orderId).toBe('old-order')
    saveBuyNowIntent(product, 1)
    expect(loadCheckoutSession()).toBeNull()
    expect(loadBuyNowIntent()?.productId).toBe('prod-1')
  })
})
