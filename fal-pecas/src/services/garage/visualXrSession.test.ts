import { describe, expect, it } from 'vitest'
import { DEFAULT_VISUAL_PAYLOAD } from '@/services/garage/vehicleVisualTypes'
import {
  attachXrPartMarkers,
  buildProceduralCarGroup,
  partMarkerCountForXr,
  resolveXrSessionInit,
  visualXrSessionBlockedReason,
} from './visualXrSession'
import * as THREE from 'three'

describe('visualXrSession', () => {
  it('bloqueia reduced-motion e ausência de API', () => {
    expect(
      visualXrSessionBlockedReason({ reduceMotion: true, hasXrApi: true }),
    ).toBe('reduced_motion')
    expect(
      visualXrSessionBlockedReason({ reduceMotion: false, hasXrApi: false }),
    ).toBe('no_xr_api')
    expect(
      visualXrSessionBlockedReason({ reduceMotion: false, hasXrApi: true }),
    ).toBeNull()
  })

  it('AR pede hit-test opcional; VR não', () => {
    const ar = resolveXrSessionInit('immersive-ar')
    expect(ar.requiredFeatures).toContain('local')
    expect(ar.optionalFeatures).toContain('hit-test')
    const vr = resolveXrSessionInit('immersive-vr')
    expect(vr.requiredFeatures).toContain('local-floor')
    expect(vr.optionalFeatures ?? []).not.toContain('hit-test')
  })

  it('marcadores só com sync; cap 12', () => {
    expect(
      partMarkerCountForXr({ syncEnabled: false, modelPartCount: 5, orphanCount: 2 }),
    ).toBe(0)
    expect(
      partMarkerCountForXr({ syncEnabled: true, modelPartCount: 5, orphanCount: 2 }),
    ).toBe(7)
    expect(
      partMarkerCountForXr({ syncEnabled: true, modelPartCount: 20, orphanCount: 5 }),
    ).toBe(12)
  })

  it('monta procedural + markers sem throw', () => {
    const group = buildProceduralCarGroup(DEFAULT_VISUAL_PAYLOAD)
    expect(group.children.length).toBeGreaterThan(0)
    const root = new THREE.Group()
    expect(attachXrPartMarkers(root, 3)).toHaveLength(3)
    expect(root.children.length).toBe(3)
  })
})
