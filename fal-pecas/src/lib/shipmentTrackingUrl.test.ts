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

  it('monta Melhor Envio por provider/carrier', () => {
    expect(
      buildTrackingUrl({ trackingCode: 'ME-ABC-123', provider: 'melhorenvio' }),
    ).toContain('melhorrastreio.com.br/rastreio/')
    expect(
      buildTrackingUrl({ trackingCode: 'XYZ999', carrier: 'Melhor Envio' }),
    ).toContain('melhorrastreio')
  })

  it('código que já é URL passa direto', () => {
    expect(buildTrackingUrl({ trackingCode: 'https://track.example/1' })).toBe(
      'https://track.example/1',
    )
  })

  it('retorna null sem dados', () => {
    expect(buildTrackingUrl({})).toBeNull()
  })
})
