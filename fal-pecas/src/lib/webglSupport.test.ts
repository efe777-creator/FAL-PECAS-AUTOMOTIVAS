import { describe, expect, it } from 'vitest'
import { canUseWebGL } from './webglSupport'

describe('canUseWebGL', () => {
  it('não quebra em ambiente sem document/WebGL', () => {
    expect(typeof canUseWebGL()).toBe('boolean')
  })
})
