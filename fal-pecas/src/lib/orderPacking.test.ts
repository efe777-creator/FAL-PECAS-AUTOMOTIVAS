import { describe, expect, it } from 'vitest'
import { emptyPackingVolume, parseOrderPacking, volumesToRpcPayload } from './orderPacking'

describe('orderPacking (CP-EMB)', () => {
  it('parse vazio e round-trip payload', () => {
    expect(parseOrderPacking(null).volumes).toEqual([])
    const v = emptyPackingVolume()
    v.lengthCm = 30
    const parsed = parseOrderPacking({
      packing: { volumes: volumesToRpcPayload([v]), updatedAt: '2026-11-11T00:00:00Z' },
      me: { label_state: 'quoted' },
    })
    expect(parsed.volumes).toHaveLength(1)
    expect(parsed.volumes[0]?.lengthCm).toBe(30)
    expect(parsed.volumes[0]?.unitLength).toBe('cm')
  })
})
