import { describe, expect, it } from 'vitest'
import {
  countShipmentVolumes,
  evaluateMeReverseEligibility,
  looksSyntheticMeOrderId,
  readMeCartItemId,
} from './meReverseEligibility'

describe('evaluateMeReverseEligibility', () => {
  it('ok + liveReady quando ME + 1 volume + entregue + id numérico', () => {
    const r = evaluateMeReverseEligibility({
      orderStatus: 'entregue',
      provider: 'melhorenvio',
      volumeCount: 1,
      meOrderId: '987654321',
    })
    expect(r.ok).toBe(true)
    expect(r.liveReady).toBe(true)
  })

  it('ok mas não liveReady com UUID sintético', () => {
    const r = evaluateMeReverseEligibility({
      orderStatus: 'entregue',
      provider: 'melhorenvio',
      volumeCount: 1,
      meOrderId: '12dc7b28-d7e8-4fd5-9210-931d793185e0',
    })
    expect(r.ok).toBe(true)
    expect(r.liveReady).toBe(false)
    expect(r.liveBlockers).toContain('me_order_id_synthetic')
    expect(looksSyntheticMeOrderId('12dc7b28-d7e8-4fd5-9210-931d793185e0')).toBe(true)
    expect(looksSyntheticMeOrderId('987654321')).toBe(false)
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
    expect(r.blockers).toContain('multi_volume')
  })

  it('bloqueia volume desconhecido', () => {
    const r = evaluateMeReverseEligibility({
      orderStatus: 'entregue',
      provider: 'melhorenvio',
      volumeCount: 0,
      meOrderId: 'abc',
    })
    expect(r.ok).toBe(false)
    expect(r.blockers).toContain('volume_unknown')
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
