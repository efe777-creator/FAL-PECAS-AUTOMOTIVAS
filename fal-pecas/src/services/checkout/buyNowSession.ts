/**
 * AJUSTE-035 C5 — intent buy_now isolada do CartContext.
 */

import type { CartItem, Product } from '@/types'
import {
  clearCheckoutIdempotencyKey,
  clearCheckoutSession,
} from '@/services/checkout/checkoutSession'

const KEY = 'fal.buyNowIntent.v1'
const memory = new Map<string, string>()

function storageGet(key: string): string | null {
  try {
    if (typeof sessionStorage !== 'undefined') {
      return sessionStorage.getItem(key)
    }
  } catch {
    /* private mode */
  }
  return memory.get(key) ?? null
}

function storageSet(key: string, value: string): void {
  memory.set(key, value)
  try {
    if (typeof sessionStorage !== 'undefined') {
      sessionStorage.setItem(key, value)
    }
  } catch {
    /* memory only */
  }
}

function storageRemove(key: string): void {
  memory.delete(key)
  try {
    if (typeof sessionStorage !== 'undefined') {
      sessionStorage.removeItem(key)
    }
  } catch {
    /* ignore */
  }
}

export type BuyNowIntent = {
  productId: string
  quantity: number
  name: string
  sku: string
  price: number
  imageUrl?: string | null
  savedAt: string
}

export function saveBuyNowIntent(product: Product, quantity: number): void {
  const qty = Math.max(1, Math.floor(quantity) || 1)
  const payload: BuyNowIntent = {
    productId: product.id,
    quantity: qty,
    name: product.name,
    sku: product.sku,
    price: product.price,
    imageUrl: product.imageUrl ?? undefined,
    savedAt: new Date().toISOString(),
  }
  // Compra nova não deve retomar cobrança antiga (C2 recovery ≠ sequestrar buy_now).
  clearCheckoutSession()
  clearCheckoutIdempotencyKey()
  storageSet(KEY, JSON.stringify(payload))
}

export function loadBuyNowIntent(): BuyNowIntent | null {
  try {
    const raw = storageGet(KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as BuyNowIntent
    if (!parsed?.productId || !parsed.quantity) return null
    return parsed
  } catch {
    return null
  }
}

export function clearBuyNowIntent(): void {
  storageRemove(KEY)
}

export function buyNowIntentToCartItems(intent: BuyNowIntent): CartItem[] {
  return [
    {
      productId: intent.productId,
      quantity: intent.quantity,
      name: intent.name,
      sku: intent.sku,
      price: intent.price,
      imageUrl: intent.imageUrl,
    },
  ]
}
