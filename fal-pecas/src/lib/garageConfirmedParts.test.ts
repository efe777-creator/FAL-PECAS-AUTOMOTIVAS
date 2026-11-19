import { describe, expect, it } from 'vitest'
import { filterConfirmedCompatibleProducts } from '@/lib/garageConfirmedParts'
import type { Product } from '@/types'

const baseProduct = (id: string): Product =>
  ({
    id,
    name: `Peça ${id}`,
    slug: id,
    price: 10,
  }) as Product

describe('filterConfirmedCompatibleProducts', () => {
  const vehicle = {
    maker: 'Chevrolet',
    model: 'Onix',
    year: 2020,
    engine: '1.0',
  }

  it('retorna vazio sem veículo completo', () => {
    expect(
      filterConfirmedCompatibleProducts([baseProduct('a')], null, new Map()),
    ).toEqual([])
    expect(
      filterConfirmedCompatibleProducts(
        [baseProduct('a')],
        { maker: 'Chevrolet' },
        new Map(),
      ),
    ).toEqual([])
  })

  it('mantém só confirmed via PVC (não apps truncadas do card)', () => {
    const products = [baseProduct('ok'), baseProduct('no'), baseProduct('prob')]
    const pvc = new Map([
      [
        'ok',
        [
          {
            maker: 'Chevrolet',
            model: 'Onix',
            yearStart: 2019,
            yearEnd: 2022,
            engine: '1.0',
            versionName: 'LT',
            vehicleVersionId: 'vv-lt',
          },
        ],
      ],
      [
        'prob',
        [
          {
            maker: 'Chevrolet',
            model: 'Onix',
            yearStart: null,
            yearEnd: null,
            engine: null,
            versionName: null,
          },
        ],
      ],
    ])
    const confirmed = filterConfirmedCompatibleProducts(
      products,
      { ...vehicle, version: 'LT', versionId: 'vv-lt' },
      pvc,
    )
    expect(confirmed.map((p) => p.id)).toEqual(['ok'])
  })
})
