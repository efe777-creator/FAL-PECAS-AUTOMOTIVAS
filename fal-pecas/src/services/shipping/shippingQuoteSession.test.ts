import { beforeEach, describe, expect, it } from 'vitest'
import {
  clearShippingQuoteHandoff,
  loadShippingQuoteHandoff,
  matchPreferredShippingOption,
  preferenceKindFromOption,
  saveShippingQuoteHandoff,
} from '@/services/shipping/shippingQuoteSession'
import { createStorePickupOption, STORE_PICKUP_OPTION_ID } from '@/services/shipping/storePickupOption'
import type { ShippingQuoteOption } from '@/types'

const memory = new Map<string, string>()

beforeEach(() => {
  memory.clear()
  clearShippingQuoteHandoff()
  Object.defineProperty(globalThis, 'sessionStorage', {
    configurable: true,
    value: {
      getItem: (k: string) => memory.get(k) ?? null,
      setItem: (k: string, v: string) => {
        memory.set(k, v)
      },
      removeItem: (k: string) => {
        memory.delete(k)
      },
    },
  })
})

describe('shippingQuoteSession', () => {
  it('salva pickup sem CEP e carrega', () => {
    saveShippingQuoteHandoff({ option: createStorePickupOption() })
    const h = loadShippingQuoteHandoff()
    expect(h?.preferredKind).toBe('pickup')
    expect(h?.preferredOptionId).toBe(STORE_PICKUP_OPTION_ID)
  })

  it('exige CEP para carrier', () => {
    saveShippingQuoteHandoff({
      option: {
        id: 'meq:1',
        provider: 'melhorenvio',
        serviceCode: '1',
        label: 'SEDEX',
        amount: 15,
      },
    })
    expect(loadShippingQuoteHandoff()).toBeNull()

    saveShippingQuoteHandoff({
      postalCode: '01310-100',
      option: {
        id: 'meq:1',
        provider: 'melhorenvio',
        serviceCode: '1',
        label: 'SEDEX',
        amount: 15,
      },
    })
    expect(loadShippingQuoteHandoff()?.preferredOptionId).toBe('meq:1')
  })

  it('match: id exato → pickup → serviceCode → label (ownq efêmero)', () => {
    const opts: ShippingQuoteOption[] = [
      {
        id: 'ownq:aaaa-bbbb:moto',
        provider: 'own',
        serviceCode: 'moto',
        label: 'Entrega FAL (Motocicleta)',
        amount: 40,
      },
      createStorePickupOption(),
      {
        id: 'meq:sedex',
        provider: 'melhorenvio',
        serviceCode: '2',
        label: 'Correios — SEDEX',
        amount: 15,
      },
    ]

    expect(
      matchPreferredShippingOption(opts, {
        preferredOptionId: 'meq:sedex',
        preferredKind: 'carrier',
        savedAt: new Date().toISOString(),
        postalCode: '01310100',
      })?.id,
    ).toBe('meq:sedex')

    expect(
      matchPreferredShippingOption(opts, {
        preferredKind: 'pickup',
        preferredOptionId: STORE_PICKUP_OPTION_ID,
        savedAt: new Date().toISOString(),
      })?.id,
    ).toBe(STORE_PICKUP_OPTION_ID)

    expect(
      matchPreferredShippingOption(opts, {
        preferredOptionId: 'ownq:OLD-UUID:moto',
        preferredKind: 'own',
        preferredServiceCode: 'moto',
        preferredLabel: 'Entrega FAL (Motocicleta)',
        postalCode: '01310100',
        savedAt: new Date().toISOString(),
      })?.id,
    ).toBe('ownq:aaaa-bbbb:moto')

    expect(preferenceKindFromOption(opts[0]!)).toBe('own')
  })

  it('match: provisional Entrega FAL da PDP → own precificada no checkout', () => {
    const priced: ShippingQuoteOption = {
      id: 'ownq:new:moto',
      provider: 'own',
      serviceCode: 'moto',
      label: 'Entrega FAL (Motocicleta)',
      amount: 61.29,
    }
    expect(
      matchPreferredShippingOption([priced, createStorePickupOption()], {
        preferredOptionId: 'own:confirm_checkout',
        preferredKind: 'own',
        preferredServiceCode: 'own_confirm_checkout',
        preferredLabel: 'Entrega FAL',
        postalCode: '08290220',
        savedAt: new Date().toISOString(),
      })?.id,
    ).toBe('ownq:new:moto')
  })

  it('match: preferência own na PDP sem preço → provisional', () => {
    const provisional = {
      id: 'own:confirm_checkout',
      provider: 'own',
      serviceCode: 'own_confirm_checkout',
      label: 'Entrega FAL',
      amount: 0,
      metadata: { kind: 'own_confirm_checkout', provisional: true },
    } satisfies ShippingQuoteOption
    expect(
      matchPreferredShippingOption(
        [
          {
            id: 'meq:1',
            provider: 'melhorenvio',
            serviceCode: '1',
            label: 'PAC',
            amount: 15,
          },
          provisional,
          createStorePickupOption(),
        ],
        {
          preferredKind: 'own',
          preferredLabel: 'Entrega FAL',
          postalCode: '01310100',
          savedAt: new Date().toISOString(),
        },
      )?.id,
    ).toBe('own:confirm_checkout')
  })
})
