import { describe, expect, it } from 'vitest'
import type { VisualPartPreview } from '@/services/garage/vehicleVisualPartPreview'
import {
  buildXrCommercialParts,
  xrCartPath,
  xrCommercialTelemetryReason,
  xrExitToCartTelemetryReason,
  xrNeverCheckoutsInSession,
  xrNeverPaysInSession,
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
  it('nunca paga in-XR; C4 legado alinha', () => {
    expect(xrNeverPaysInSession()).toBe(true)
    expect(xrNeverCheckoutsInSession()).toBe(true)
  })

  it('paths web C4/C5', () => {
    expect(xrProductPath('abc/def')).toBe('/produto/abc%2Fdef')
    expect(xrCartPath()).toBe('/carrinho')
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
    expect(xrExitToCartTelemetryReason('p1')).toBe('exit_to_cart+has_product')
  })
})
