import { afterEach, describe, expect, it } from 'vitest'
import {
  __setAnalyticsTestSink,
  canTrackAnalytics,
  track,
  trackAddToCart,
  trackPageView,
  trackPurchase,
} from './analytics'

afterEach(() => {
  __setAnalyticsTestSink(null)
})

describe('analytics', () => {
  it('canTrack exige consent e IDs', () => {
    expect(canTrackAnalytics({ marketingConsent: false, idsConfigured: true })).toBe(
      false,
    )
    expect(canTrackAnalytics({ marketingConsent: true, idsConfigured: false })).toBe(
      false,
    )
    expect(canTrackAnalytics({ marketingConsent: true, idsConfigured: true })).toBe(true)
  })

  it('track com sink de teste registra eventos', () => {
    const seen: Array<{ e: string; p: Record<string, unknown> }> = []
    __setAnalyticsTestSink((e, p) => {
      seen.push({ e, p })
    })
    trackAddToCart({ itemId: 'p1', itemName: 'Filtro', price: 10, quantity: 2 })
    trackPurchase({ orderId: 'ord-1', value: 99.9 })
    track('page_view', { page_path: '/' })
    expect(seen.map((s) => s.e)).toEqual(['add_to_cart', 'purchase', 'page_view'])
    expect(seen[0]?.p.items).toBeTruthy()
  })

  it('track no-op sem sink não quebra em Node (sem localStorage/IDs)', () => {
    expect(() => track('page_view', { page_path: '/x' })).not.toThrow()
    expect(() => trackPageView('/y')).not.toThrow()
  })
})
