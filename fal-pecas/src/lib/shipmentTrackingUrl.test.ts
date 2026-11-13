import { describe, expect, it } from 'vitest'
import { buildTrackingUrl } from './shipmentTrackingUrl'

describe('buildTrackingUrl', () => {
  it('usa URL explícita', () => {
    expect(buildTrackingUrl({ trackingUrl: 'https://example.com/t/1' })).toBe(
      'https://example.com/t/1',
    )
  })

  it('monta Correios a partir do código', () => {
    expect(buildTrackingUrl({ trackingCode: 'AB123456789BR' })).toContain('linkcorreios')
  })

  it('retorna null sem dados', () => {
    expect(buildTrackingUrl({})).toBeNull()
  })
})
