import { describe, expect, it } from 'vitest'
import { canTransitionAssetStatus } from './adminVisualAssetService'

describe('canTransitionAssetStatus', () => {
  it('permite review → approved e retired a partir de approved', () => {
    expect(canTransitionAssetStatus('draft', 'approved')).toBe(true)
    expect(canTransitionAssetStatus('draft', 'review')).toBe(true)
    expect(canTransitionAssetStatus('review', 'approved')).toBe(true)
    expect(canTransitionAssetStatus('rejected', 'approved')).toBe(true)
    expect(canTransitionAssetStatus('approved', 'revoked')).toBe(true)
    expect(canTransitionAssetStatus('approved', 'retired')).toBe(true)
    expect(canTransitionAssetStatus('draft', 'revoked')).toBe(false)
    expect(canTransitionAssetStatus('revoked', 'approved')).toBe(false)
  })
})
