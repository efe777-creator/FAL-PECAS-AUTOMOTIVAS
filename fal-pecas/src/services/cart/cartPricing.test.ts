import { describe, expect, it, vi, beforeEach } from 'vitest'
import type { CartItem } from '@/types'

vi.mock('@/lib/supabase', () => ({
  isSupabaseConfigured: true,
  supabase: {},
}))

vi.mock('@/services/customers/customerService', () => ({
  getCurrentCustomerId: vi.fn(async () => null),
}))

const resolveProductPrices = vi.fn()

vi.mock('@/services/pricing/priceResolutionService', () => ({
  resolveProductPrices: (...args: unknown[]) => resolveProductPrices(...args),
}))

import { applyResolvedPricesToCartItems } from './cartPricing'

describe('applyResolvedPricesToCartItems', () => {
  beforeEach(() => {
    resolveProductPrices.mockReset()
  })

  it('substitui preço pelo amount resolvido', async () => {
    resolveProductPrices.mockResolvedValue(
      new Map([['p1', { productId: 'p1', amount: 50, priceListId: null, priceListSlug: 'base', usedOverride: false, usedDefaultFallback: false, priceSource: 'list' }]]),
    )
    const items: CartItem[] = [
      { productId: 'p1', sku: 'SK3248', name: 'X', price: 37.99, quantity: 1 },
    ]
    const out = await applyResolvedPricesToCartItems(items, null)
    expect(out[0]?.price).toBe(50)
    expect(resolveProductPrices).toHaveBeenCalledWith(['p1'], null)
  })

  it('mantém preço se RPC não retorna o produto', async () => {
    resolveProductPrices.mockResolvedValue(new Map())
    const items: CartItem[] = [
      { productId: 'p2', sku: 'A', name: 'Y', price: 10, quantity: 2 },
    ]
    const out = await applyResolvedPricesToCartItems(items, null)
    expect(out[0]?.price).toBe(10)
  })
})
