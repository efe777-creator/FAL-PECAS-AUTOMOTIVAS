import { describe, expect, it } from 'vitest'
import { canTransitionAssetStatus } from './adminVisualAssetService'

describe('canTransitionAssetStatus', () => {
  it('permite aprovar draft/rejected; revogar só approved', () => {
    expect(canTransitionAssetStatus('draft', 'approved')).toBe(true)
    expect(canTransitionAssetStatus('rejected', 'approved')).toBe(true)
    expect(canTransitionAssetStatus('approved', 'revoked')).toBe(true)
    expect(canTransitionAssetStatus('draft', 'revoked')).toBe(false)
    expect(canTransitionAssetStatus('revoked', 'approved')).toBe(false)
  })
})
