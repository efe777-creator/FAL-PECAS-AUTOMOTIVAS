import { describe, expect, it } from 'vitest'
import { isVirtualPriceListItemId } from '@/services/admin/adminPriceListService'

describe('isVirtualPriceListItemId', () => {
  it('detecta itens missing:', () => {
    expect(isVirtualPriceListItemId('missing:abc-123')).toBe(true)
    expect(isVirtualPriceListItemId('uuid-real')).toBe(false)
  })
})
