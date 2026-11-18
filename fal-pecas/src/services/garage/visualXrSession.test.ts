import { describe, expect, it } from 'vitest'
import { DEFAULT_VISUAL_PAYLOAD } from '@/services/garage/vehicleVisualTypes'
import {
  buildProceduralCarGroup,
  visualXrSessionBlockedReason,
} from './visualXrSession'

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

  it('monta grupo procedural sem throw (visual ≠ fato)', () => {
    const group = buildProceduralCarGroup(DEFAULT_VISUAL_PAYLOAD)
    expect(group.children.length).toBeGreaterThan(0)
  })
})
