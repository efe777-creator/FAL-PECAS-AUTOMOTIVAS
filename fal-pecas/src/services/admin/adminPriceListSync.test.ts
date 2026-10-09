import { describe, expect, it } from 'vitest'
import { isVirtualPriceListItemId } from '@/services/admin/adminPriceListService'
import { filterPriceListItems, type PriceListItem } from '@/services/admin/adminPriceListService'

function item(partial: Partial<PriceListItem> & Pick<PriceListItem, 'id' | 'productId'>): PriceListItem {
  return {
    priceListId: 'list-1',
    price: 0,
    extraCost: 0,
    priceOrigin: 'calculated',
    calculatedPrice: null,
    baseCost: 10,
    costTotal: 10,
    effectiveMarginPct: null,
    effectiveMarkupPct: null,
    sku: 'SKU',
    productName: 'Produto',
    ...partial,
  }
}

describe('visão operacional / filtros', () => {
  it('inclui virtuais missing: no filtro Sem preço', () => {
    const rows = [
      item({ id: 'a', productId: 'p1', price: 50, sku: 'A' }),
      item({ id: 'missing:p2', productId: 'p2', price: 0, sku: 'B', baseCost: 20 }),
    ]
    const filtered = filterPriceListItems(rows, { withoutPrice: true })
    expect(filtered.map((r) => r.id)).toEqual(['missing:p2'])
    expect(isVirtualPriceListItemId(filtered[0]!.id)).toBe(true)
  })

  it('busca unificada encontra virtual por SKU', () => {
    const rows = [
      item({ id: 'missing:p9', productId: 'p9', price: 0, sku: 'TDI1083', productName: 'Terminal' }),
    ]
    expect(filterPriceListItems(rows, { q: 'tdi1083' })).toHaveLength(1)
  })
})
