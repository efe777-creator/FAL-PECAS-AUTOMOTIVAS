import { describe, expect, it } from 'vitest'
import { resolveBaseCost } from '@/services/admin/adminPriceListService'

describe('resolveBaseCost', () => {
  const falId = 'fal-uuid'
  const otherId = 'other-uuid'
  const productId = 'prod-1'

  it('usa custo do supplier_id do produto', () => {
    const map = new Map([[`${otherId}:${productId}`, 10], [`${falId}:${productId}`, 99]])
    expect(resolveBaseCost(productId, otherId, map, falId)).toBe(10)
  })

  it('fallback FAL quando supplier_id null', () => {
    const map = new Map([[`${falId}:${productId}`, 42.5]])
    expect(resolveBaseCost(productId, null, map, falId)).toBe(42.5)
  })

  it('fallback FAL quando supplier sem custo mas FAL tem', () => {
    const map = new Map([[`${falId}:${productId}`, 15]])
    expect(resolveBaseCost(productId, otherId, map, falId)).toBe(15)
  })

  it('null quando sem custo', () => {
    expect(resolveBaseCost(productId, null, new Map(), falId)).toBeNull()
  })
})
