import { describe, expect, it } from 'vitest'
import {
  filterPriceListItems,
  sortPriceListItems,
  type PriceListItem,
} from './adminPriceListService'

function item(partial: Partial<PriceListItem> & Pick<PriceListItem, 'id'>): PriceListItem {
  return {
    priceListId: 'list',
    productId: partial.id,
    price: 100,
    extraCost: 0,
    priceOrigin: 'manual',
    calculatedPrice: null,
    baseCost: 50,
    costTotal: 50,
    effectiveMarginPct: 50,
    effectiveMarkupPct: 100,
    sku: 'SKU-A',
    productName: 'Produto A',
    supplierId: 'sup-1',
    supplierName: 'Fornecedor 1',
    hasOverride: false,
    updatedAt: '2026-10-01T00:00:00Z',
    ...partial,
  }
}

describe('filterPriceListItems', () => {
  const rows = [
    item({
      id: '1',
      sku: 'ABC-1',
      productName: 'Filtro óleo',
      priceOrigin: 'calculated',
      baseCost: null,
      costTotal: null,
      price: 0,
    }),
    item({
      id: '2',
      sku: 'XYZ-2',
      productName: 'Pastilha',
      priceOrigin: 'imported',
      hasOverride: true,
      supplierId: 'sup-2',
    }),
    item({
      id: '3',
      sku: 'MAN-3',
      productName: 'Manual item',
      priceOrigin: 'manual',
    }),
  ]

  it('filtra por SKU e descrição combinados', () => {
    expect(filterPriceListItems(rows, { sku: 'xyz', description: 'past' })).toHaveLength(1)
  })

  it('filtra origem e sem custo', () => {
    expect(filterPriceListItems(rows, { origin: 'calculated', withoutCost: true })).toEqual([
      rows[0],
    ])
  })

  it('filtra sem preço e override', () => {
    expect(filterPriceListItems(rows, { withoutPrice: true })).toEqual([rows[0]])
    expect(filterPriceListItems(rows, { withOverride: true })).toEqual([rows[1]])
  })

  it('busca unificada q em sku, descrição e manufacturer_code', () => {
    const withCode = [
      ...rows,
      item({
        id: '4',
        sku: 'ZZZ',
        productName: 'Outro',
        manufacturerCode: 'REF-99',
      }),
    ]
    expect(filterPriceListItems(withCode, { q: 'past' })).toEqual([rows[1]])
    expect(filterPriceListItems(withCode, { q: 'abc' })).toEqual([rows[0]])
    expect(filterPriceListItems(withCode, { q: 'ref-99' })).toHaveLength(1)
    expect(filterPriceListItems(withCode, { q: 'ref-99' })[0]?.id).toBe('4')
  })
})

describe('sortPriceListItems', () => {
  const rows = [
    item({ id: '1', sku: 'B', price: 20, priceOrigin: 'manual', updatedAt: '2026-01-02' }),
    item({ id: '2', sku: 'A', price: 10, priceOrigin: 'calculated', updatedAt: '2026-01-01' }),
  ]

  it('ordena por SKU e preço', () => {
    expect(sortPriceListItems(rows, 'sku', true).map((r) => r.sku)).toEqual(['A', 'B'])
    expect(sortPriceListItems(rows, 'price', false).map((r) => r.price)).toEqual([20, 10])
  })

  it('ordena por origem sem alterar valores', () => {
    const sorted = sortPriceListItems(rows, 'origin', true)
    expect(sorted.map((r) => r.priceOrigin)).toEqual(['calculated', 'manual'])
    expect(sorted.find((r) => r.id === '1')?.price).toBe(20)
  })
})
