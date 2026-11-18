import { describe, expect, it, vi } from 'vitest'
import {
  FAL_NOTIF_CHANGED,
  emitNotifChanged,
  subscribeNotifChanged,
} from './notificationEvents'

describe('notificationEvents', () => {
  it('emite audience e unread otimista', () => {
    const handler = vi.fn()
    const off = subscribeNotifChanged(handler)
    emitNotifChanged('customer', { unread: 2 })
    expect(handler).toHaveBeenCalledWith({ audience: 'customer', unread: 2 })
    off()
    emitNotifChanged('staff')
    expect(handler).toHaveBeenCalledTimes(1)
  })

  it('usa o nome de evento estável', () => {
    expect(FAL_NOTIF_CHANGED).toBe('fal:notif-changed')
  })
})
