import { describe, expect, it } from 'vitest'
import {
  effectiveRenderSource,
  glbLoaderAvailable,
  resolveVisualizationSource,
  visualizationNeverWrites2A,
} from './visualizationEngine'

describe('visualizationEngine', () => {
  it('nunca escreve 2A; GLB loader ainda indisponível (B1)', () => {
    expect(visualizationNeverWrites2A()).toBe(true)
    expect(glbLoaderAvailable()).toBe(false)
  })

  it('pref 2d ou sem WebGL → 2d', () => {
    expect(
      resolveVisualizationSource({
        preferredMode: '2d',
        webglOk: true,
        hasApprovedGlb: true,
      }),
    ).toBe('2d')
    expect(
      resolveVisualizationSource({
        preferredMode: 'auto',
        webglOk: false,
        hasApprovedGlb: true,
      }),
    ).toBe('2d')
  })

  it('WebGL + auto/3d sem GLB → procedural', () => {
    expect(
      resolveVisualizationSource({
        preferredMode: 'auto',
        webglOk: true,
        hasApprovedGlb: false,
      }),
    ).toBe('procedural')
  })

  it('WebGL + asset aprovado → glb (contrato; render B1 degrada)', () => {
    expect(
      resolveVisualizationSource({
        preferredMode: 'auto',
        webglOk: true,
        hasApprovedGlb: true,
      }),
    ).toBe('glb')
    expect(effectiveRenderSource('glb', true)).toBe('procedural')
    expect(effectiveRenderSource('glb', false)).toBe('2d')
  })

  it('XR só com gate + suporte', () => {
    expect(
      resolveVisualizationSource({
        preferredMode: 'auto',
        webglOk: true,
        hasApprovedGlb: false,
        xrEnabled: true,
        xrSupported: true,
      }),
    ).toBe('xr')
    expect(
      resolveVisualizationSource({
        preferredMode: 'auto',
        webglOk: true,
        hasApprovedGlb: false,
        xrEnabled: false,
        xrSupported: true,
      }),
    ).toBe('procedural')
  })
})
