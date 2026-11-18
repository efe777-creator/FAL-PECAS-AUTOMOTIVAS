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

  it('propaga vehicle_snapshot do intent para itens de checkout (G6)', () => {
    const snap = {
      customerVehicleId: 'v1',
      maker: 'VW',
      model: 'Gol',
      year: 2018,
      version: null,
      engine: '1.0',
      versionId: null,
      plate: 'ABC1D23',
      associatedAt: '2026-11-18T00:00:00.000Z',
      contextSource: 'active' as const,
    }
    saveBuyNowIntent(product, 1, {
      customerVehicleId: 'v1',
      vehicleSnapshot: snap,
    })
    const items = buyNowIntentToCartItems(loadBuyNowIntent()!)
    expect(items[0].customerVehicleId).toBe('v1')
    expect(items[0].vehicleSnapshot?.maker).toBe('VW')
    expect(items[0].vehicleSnapshot?.plate).toBe('ABC1D23')
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
