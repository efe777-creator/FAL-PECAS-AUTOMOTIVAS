import { describe, expect, it } from 'vitest'
import { resolveViewerMode } from './visualViewerPrefs'

describe('resolveViewerMode', () => {
  it('força 2D sem WebGL mesmo em auto/3d', () => {
    expect(resolveViewerMode('auto', false)).toBe('2d')
    expect(resolveViewerMode('3d', false)).toBe('2d')
  })

  it('respeita preferência 2d', () => {
    expect(resolveViewerMode('2d', true)).toBe('2d')
  })

  it('usa 3d quando WebGL ok e auto/3d', () => {
    expect(resolveViewerMode('auto', true)).toBe('3d')
    expect(resolveViewerMode('3d', true)).toBe('3d')
  })
})
