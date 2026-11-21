import { describe, expect, it } from 'vitest'
import {
  countShipmentVolumes,
  evaluateMeReverseEligibility,
  readMeCartItemId,
} from './meReverseEligibility'

describe('evaluateMeReverseEligibility', () => {
  it('ok quando ME + 1 volume + entregue + cart id', () => {
    const r = evaluateMeReverseEligibility({
      orderStatus: 'entregue',
      provider: 'melhorenvio',
      volumeCount: 1,
      meOrderId: 'abc-123',
    })
    expect(r.ok).toBe(true)
  })

  it('bloqueia frete próprio', () => {
    const r = evaluateMeReverseEligibility({
      orderStatus: 'entregue',
      provider: 'own',
      volumeCount: 1,
      meOrderId: 'abc',
    })
    expect(r.ok).toBe(false)
    expect(r.blockers).toContain('provider_not_me')
  })

  it('bloqueia multi-volume', () => {
    const r = evaluateMeReverseEligibility({
      orderStatus: 'entregue',
      provider: 'melhorenvio_sandbox',
      volumeCount: 2,
      meOrderId: 'abc',
    })
    expect(r.ok).toBe(false)
    expect(r.blockers).toContain('multi_volume_or_unknown')
  })
})

describe('countShipmentVolumes / readMeCartItemId', () => {
  it('lê packing.volumes e me.cart_item_id', () => {
    expect(
      countShipmentVolumes({
        packing: { volumes: [{ widthCm: 11 }] },
        me: { cart_item_id: 'me-1' },
      }),
    ).toBe(1)
    expect(readMeCartItemId({ me: { cart_item_id: 'me-1' } })).toBe('me-1')
  })
})
