import { describe, expect, it } from 'vitest'
import {
  createStorePickupOption,
  ensureCustomerShippingOptions,
  formatStoreOriginAddress,
  isStorePickupOption,
  STORE_PICKUP_OPTION_ID,
  withStorePickupOption,
} from '@/services/shipping/storePickupOption'
import type { ShippingQuoteOption } from '@/types'

describe('storePickupOption', () => {
  it('createStorePickupOption é R$ 0 estável', () => {
    const o = createStorePickupOption()
    expect(o.id).toBe(STORE_PICKUP_OPTION_ID)
    expect(o.amount).toBe(0)
    expect(o.serviceCode).toBe('pickup')
    expect(isStorePickupOption(o)).toBe(true)
  })

  it('withStorePickupOption não duplica', () => {
    const base: ShippingQuoteOption[] = [
      { id: 'meq:1', provider: 'melhorenvio', serviceCode: '1', label: 'SEDEX', amount: 15 },
    ]
    const once = withStorePickupOption(base)
    expect(once.filter((o) => isStorePickupOption(o))).toHaveLength(1)
    expect(withStorePickupOption(once)).toHaveLength(once.length)
  })

  it('ensureCustomerShippingOptions ordena preço e deixa retirada por último', () => {
    const opts: ShippingQuoteOption[] = [
      { id: 'meq:a', provider: 'melhorenvio', serviceCode: '2', label: 'SEDEX', amount: 40 },
      createStorePickupOption(),
      { id: 'ownq:1:moto', provider: 'own', serviceCode: 'moto', label: 'FAL', amount: 12 },
      { id: 'meq:b', provider: 'melhorenvio', serviceCode: '1', label: 'PAC', amount: 20 },
    ]
    expect(ensureCustomerShippingOptions(opts).map((o) => o.id)).toEqual([
      'ownq:1:moto',
      'meq:b',
      'meq:a',
      STORE_PICKUP_OPTION_ID,
    ])
  })

  it('formatStoreOriginAddress monta linha legível', () => {
    const s = formatStoreOriginAddress({
      street: 'Rua A',
      number: '10',
      complement: 'Sala 1',
      district: 'Centro',
      city: 'São Paulo',
      state: 'SP',
      postalCode: '01310100',
    })
    expect(s).toContain('Rua A, 10')
    expect(s).toContain('São Paulo/SP')
    expect(s).toContain('CEP 01310-100')
  })
})
