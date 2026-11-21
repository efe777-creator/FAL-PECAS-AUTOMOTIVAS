import { describe, expect, it } from 'vitest'
import {
  effectiveRenderSource,
  glbLoaderAvailable,
  isSmokeOrPlaceholderGlb,
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

  it('WebGL + auto sem GLB → 2d (fundação; não procedural)', () => {
    expect(
      resolveVisualizationSource({
        preferredMode: 'auto',
        webglOk: true,
        hasApprovedGlb: false,
      }),
    ).toBe('2d')
  })

  it('WebGL + pref 3d sem GLB → procedural', () => {
    expect(
      resolveVisualizationSource({
        preferredMode: '3d',
        webglOk: true,
        hasApprovedGlb: false,
      }),
    ).toBe('procedural')
  })

  it('WebGL + asset aprovado → glb; falha → 2d', () => {
    expect(
      resolveVisualizationSource({
        preferredMode: 'auto',
        webglOk: true,
        hasApprovedGlb: true,
      }),
    ).toBe('glb')
    expect(effectiveRenderSource('glb', true)).toBe('glb')
    expect(effectiveRenderSource('glb', true, { glbLoadFailed: true })).toBe('2d')
    expect(effectiveRenderSource('glb', false)).toBe('2d')
  })

  it('auto + reduced motion → 2d; pref 3d ainda resolve glb', () => {
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

  it('XR só com gate + suporte + pref 3d; canvas base glb ou 2d', () => {
    expect(
      resolveVisualizationSource({
        preferredMode: 'auto',
        webglOk: true,
        hasApprovedGlb: false,
        xrEnabled: true,
        xrSupported: true,
      }),
    ).toBe('2d')
    expect(
      resolveVisualizationSource({
        preferredMode: '3d',
        webglOk: true,
        hasApprovedGlb: false,
        xrEnabled: true,
        xrSupported: true,
      }),
    ).toBe('xr')
    expect(effectiveRenderSource('xr', true)).toBe('2d')
    expect(effectiveRenderSource('xr', true, { hasApprovedGlb: true })).toBe('glb')
    expect(
      effectiveRenderSource('xr', true, { hasApprovedGlb: true, glbLoadFailed: true }),
    ).toBe('2d')
  })

  it('detecta smoke/placeholder GLB', () => {
    expect(isSmokeOrPlaceholderGlb('fal-smoke-palio-box')).toBe(true)
    expect(isSmokeOrPlaceholderGlb('asset-placeholder-v1')).toBe(true)
    expect(isSmokeOrPlaceholderGlb('vw-gol-gen5')).toBe(false)
  })
})
