import { describe, expect, it } from 'vitest'
import { prefersReducedMotion, visualPixelRatioCap } from './visualMotionPrefs'

describe('visualMotionPrefs', () => {
  it('prefersReducedMotion retorna boolean sem quebrar', () => {
    expect(typeof prefersReducedMotion()).toBe('boolean')
  })

  it('cap DPR: reduced → 1; senão ≤ 2', () => {
    expect(visualPixelRatioCap(true)).toBe(1)
    expect(visualPixelRatioCap(false)).toBeLessThanOrEqual(2)
  })
})
