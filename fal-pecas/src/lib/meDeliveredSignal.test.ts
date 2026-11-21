import { describe, expect, it } from 'vitest'
import { meReportsDelivered } from './meDeliveredSignal'

describe('meReportsDelivered', () => {
  it('detecta last_webhook_event', () => {
    expect(
      meReportsDelivered({ me: { last_webhook_event: 'order.delivered' } }),
    ).toBe(true)
  })

  it('detecta tracking_events', () => {
    expect(
      meReportsDelivered({
        me: { tracking_events: [{ event: 'delivered', at: '2026-11-01' }] },
      }),
    ).toBe(true)
  })

  it('false sem sinal', () => {
    expect(meReportsDelivered({ me: { tracking: 'XX' } })).toBe(false)
    expect(meReportsDelivered(null)).toBe(false)
  })
})
