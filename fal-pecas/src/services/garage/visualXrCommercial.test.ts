import { describe, expect, it } from 'vitest'
import type { VisualPartPreview } from '@/services/garage/vehicleVisualPartPreview'
import {
  buildXrCommercialParts,
  xrCommercialTelemetryReason,
  xrNeverCheckoutsInSession,
  xrProductPath,
} from './visualXrCommercial'

function part(over: Partial<VisualPartPreview> = {}): VisualPartPreview {
  return {
    key: 'k1',
    productId: 'prod-1',
    name: 'Filtro',
    sku: 'F-1',
    imageUrl: null,
    state: 'instalada',
    orderId: null,
    sourceEventType: 'installed_declared',
    ...over,
  }
}

describe('visualXrCommercial', () => {
  it('nunca faz checkout in-XR', () => {
    expect(xrNeverCheckoutsInSession()).toBe(true)
  })

  it('deep-link de produto', () => {
    expect(xrProductPath('abc/def')).toBe('/produto/abc%2Fdef')
  })

  it('só com sync; exige sku ou productId; cap 12', () => {
    expect(buildXrCommercialParts([part()], false)).toEqual([])
    expect(buildXrCommercialParts([part({ productId: null, sku: null })], true)).toEqual([])
    const many = Array.from({ length: 15 }, (_, i) =>
      part({ key: `k${i}`, productId: `p${i}`, sku: `S${i}` }),
    )
    expect(buildXrCommercialParts(many, true)).toHaveLength(12)
  })

  it('telemetria sem PII de nome/sku cru', () => {
    const reason = xrCommercialTelemetryReason(part({ name: 'Segredo', sku: 'SKU-SECRET' }))
    expect(reason).toContain('sku_interest')
    expect(reason).not.toContain('Segredo')
    expect(reason).not.toContain('SKU-SECRET')
  })
})
