import { describe, expect, it } from 'vitest'
import { orderShippingKind, orderUsesMelhorEnvio } from './orderShippingKind'

describe('orderShippingKind', () => {
  it('detecta melhorenvio / own / mock', () => {
    expect(orderShippingKind({ shipment: { provider: 'melhorenvio' } as never })).toBe(
      'melhorenvio',
    )
    expect(orderShippingKind({ shipment: { provider: 'melhorenvio_sandbox' } as never })).toBe(
      'melhorenvio',
    )
    expect(orderShippingKind({ shipment: { provider: 'own' } as never })).toBe('own')
    expect(orderShippingKind({ shipment: { provider: 'mock' } as never })).toBe('mock')
    expect(orderShippingKind({ shipment: null })).toBe('unknown')
  })

  it('orderUsesMelhorEnvio só ME', () => {
    expect(orderUsesMelhorEnvio({ shipment: { provider: 'own' } as never })).toBe(false)
    expect(orderUsesMelhorEnvio({ shipment: { provider: 'melhorenvio' } as never })).toBe(true)
  })
})
