import { describe, expect, it } from 'vitest'
import { selectableShippingOptions } from '@/services/shipping/quoteStorefrontShipping'
import type { ShippingQuoteOption } from '@/types'

describe('selectableShippingOptions', () => {
  it('remove mock de tabela e placeholders own', () => {
    const opts: ShippingQuoteOption[] = [
      {
        id: 'mock:economic',
        provider: 'mock',
        serviceCode: 'economic',
        label: 'Econômica',
        amount: 29.9,
        metadata: { kind: 'mock_table' },
      },
      {
        id: 'own:needs_number',
        provider: 'own',
        serviceCode: 'needs_number',
        label: 'Informe número',
        amount: 0,
        metadata: { selectable: false },
      },
      {
        id: 'meq:1',
        provider: 'melhorenvio',
        serviceCode: '1',
        label: 'Jadlog',
        amount: 22.5,
      },
      {
        id: 'ownq:moto',
        provider: 'own',
        serviceCode: 'moto',
        label: 'FAL moto',
        amount: 18,
      },
      {
        id: 'mock:pickup',
        provider: 'mock',
        serviceCode: 'pickup',
        label: 'Retirada',
        amount: 0,
        metadata: { kind: 'pickup' },
      },
    ]
    const out = selectableShippingOptions(opts)
    expect(out.map((o) => o.id)).toEqual(['meq:1', 'ownq:moto', 'mock:pickup'])
  })

  it('bloqueia meq ephemeral (014)', () => {
    const opts: ShippingQuoteOption[] = [
      {
        id: 'meq:ephemeral:99',
        provider: 'melhorenvio',
        serviceCode: '99',
        label: 'PAC',
        amount: 15,
        metadata: { ephemeral: true },
      },
      {
        id: 'meq:ok',
        provider: 'melhorenvio',
        serviceCode: '1',
        label: 'Jadlog',
        amount: 20,
      },
    ]
    expect(selectableShippingOptions(opts).map((o) => o.id)).toEqual(['meq:ok'])
  })

  it('ordem preço crescente na seleção (contrato vitrine)', () => {
    const opts: ShippingQuoteOption[] = [
      { id: 'a', provider: 'melhorenvio', serviceCode: '2', label: 'SEDEX', amount: 40 },
      { id: 'b', provider: 'melhorenvio', serviceCode: '1', label: 'PAC', amount: 12 },
      { id: 'c', provider: 'own', serviceCode: 'moto', label: 'FAL', amount: 25 },
    ]
    const sorted = [...selectableShippingOptions(opts)].sort((a, b) => a.amount - b.amount)
    expect(sorted.map((o) => o.id)).toEqual(['b', 'c', 'a'])
  })
})
