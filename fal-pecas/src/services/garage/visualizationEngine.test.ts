import { describe, expect, it } from 'vitest'
import {
  effectiveRenderSource,
  glbLoaderAvailable,
  resolveVisualizationSource,
  visualizationNeverWrites2A,
} from './visualizationEngine'

describe('visualizationEngine', () => {
  it('nunca escreve 2A; GLB loader disponível (E3)', () => {
    expect(visualizationNeverWrites2A()).toBe(true)
    expect(glbLoaderAvailable()).toBe(true)
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

  it('WebGL + asset aprovado → glb render; falha → procedural', () => {
    expect(
      resolveVisualizationSource({
        preferredMode: 'auto',
        webglOk: true,
        hasApprovedGlb: true,
      }),
    ).toBe('glb')
    expect(effectiveRenderSource('glb', true)).toBe('glb')
    expect(effectiveRenderSource('glb', true, { glbLoadFailed: true })).toBe('procedural')
    expect(effectiveRenderSource('glb', false)).toBe('2d')
  })

  it('auto + reduced motion → 2d; pref 3d ainda resolve glb/procedural', () => {
    expect(
      resolveVisualizationSource({
        preferredMode: 'auto',
        webglOk: true,
        hasApprovedGlb: true,
        reducedMotion: true,
      }),
    ).toBe('2d')
    expect(
      resolveVisualizationSource({
        preferredMode: '3d',
        webglOk: true,
        hasApprovedGlb: true,
        reducedMotion: true,
      }),
    ).toBe('glb')
  })

  it('XR só com gate + suporte; render ainda procedural até Fase C', () => {
    expect(
      resolveVisualizationSource({
        preferredMode: 'auto',
        webglOk: true,
        hasApprovedGlb: false,
        xrEnabled: true,
        xrSupported: true,
      }),
    ).toBe('xr')
    expect(effectiveRenderSource('xr', true)).toBe('procedural')
  })
})
