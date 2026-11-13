import { describe, expect, it } from 'vitest'
import { preferStorefrontShippingOption } from '@/services/shipping/preferStorefrontShippingOption'
import {
  createStorePickupOption,
  ensureCustomerShippingOptions,
  STORE_PICKUP_OPTION_ID,
} from '@/services/shipping/storePickupOption'
import type { ShippingQuoteOption } from '@/types'

const sedex: ShippingQuoteOption = {
  id: 'meq:sedex',
  provider: 'melhorenvio',
  serviceCode: '2',
  label: 'Correios — SEDEX',
  amount: 25,
  etaDaysMin: 2,
  etaDaysMax: 3,
}

const pac: ShippingQuoteOption = {
  id: 'meq:pac',
  provider: 'melhorenvio',
  serviceCode: '1',
  label: 'Correios — PAC',
  amount: 15,
  etaDaysMin: 5,
  etaDaysMax: 8,
}

describe('preferStorefrontShippingOption', () => {
  it('sem handoff escolhe a mais barata (1ª da lista ordenada)', () => {
    const options = ensureCustomerShippingOptions([sedex, pac])
    expect(options[0]?.id).toBe('meq:pac')
    expect(preferStorefrontShippingOption(options, null)?.id).toBe('meq:pac')
  })

  it('respeita handoff por id mesmo se não for a mais barata', () => {
    const options = ensureCustomerShippingOptions([sedex, pac])
    expect(
      preferStorefrontShippingOption(options, {
        preferredOptionId: 'meq:sedex',
        preferredKind: 'carrier',
        postalCode: '01310100',
        savedAt: new Date().toISOString(),
      })?.id,
    ).toBe('meq:sedex')
  })

  it('respeita handoff de retirada', () => {
    const options = ensureCustomerShippingOptions([pac, createStorePickupOption()])
    expect(
      preferStorefrontShippingOption(options, {
        preferredKind: 'pickup',
        preferredOptionId: STORE_PICKUP_OPTION_ID,
        savedAt: new Date().toISOString(),
      })?.id,
    ).toBe(STORE_PICKUP_OPTION_ID)
  })

  it('lista vazia retorna null', () => {
    expect(preferStorefrontShippingOption([], null)).toBeNull()
  })

  it('fluxo PDP → checkout: escolha na cotação casa no match do checkout', () => {
    const options = ensureCustomerShippingOptions([sedex, pac])
    const first = preferStorefrontShippingOption(options, null)
    expect(first?.id).toBe('meq:pac')

    // Cliente troca para SEDEX (como na PDP) e grava handoff
    const chosen = sedex
    const handoff = {
      preferredOptionId: chosen.id,
      preferredKind: 'carrier' as const,
      preferredServiceCode: chosen.serviceCode,
      preferredLabel: chosen.label,
      postalCode: '01310100',
      savedAt: new Date().toISOString(),
    }

    // Checkout re-cota (ids ME podem mudar) — casa por serviceCode/label via prefer/match
    const reQuoted = ensureCustomerShippingOptions([
      { ...pac, id: 'meq:pac:new' },
      { ...sedex, id: 'meq:sedex:new' },
    ])
    expect(preferStorefrontShippingOption(reQuoted, handoff)?.serviceCode).toBe('2')
    expect(preferStorefrontShippingOption(reQuoted, handoff)?.label).toBe('Correios — SEDEX')
  })
})
