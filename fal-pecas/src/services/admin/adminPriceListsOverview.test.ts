import { describe, expect, it } from 'vitest'
import {
  aggregatePriceListItemCounts,
  buildPriceListsOverview,
  buildUniquePriceListSlug,
  formatDuplicatePriceListName,
  priceListStatusLabel,
  pricingMethodLabel,
  pricingRuleLabel,
  type PriceList,
} from './adminPriceListService'

function list(partial: Partial<PriceList> & Pick<PriceList, 'id' | 'name'>): PriceList {
  return {
    slug: partial.slug ?? 'lista',
    status: 'draft',
    scope: 'public',
    priority: 0,
    isDefault: false,
    pricingMethod: 'fixed',
    pricingPercent: 0,
    roundingMode: 'two_decimals',
    listExtraCost: 0,
    listExtraCostPercent: 0,
    ...partial,
  }
}

describe('F8.1-I overview aggregation', () => {
  it('agrega com/sem preço por lista e nos cards', () => {
    const lists = [
      list({ id: 'a', name: 'Varejo', status: 'active', pricingMethod: 'margin_on_sell', pricingPercent: 35 }),
      list({ id: 'b', name: 'Oficina', status: 'inactive', pricingMethod: 'markup_on_cost', pricingPercent: 50 }),
      list({ id: 'c', name: 'Rascunho', status: 'draft' }),
    ]
    const items = [
      { priceListId: 'a', price: 89.9 },
      { priceListId: 'a', price: 0 },
      { priceListId: 'b', price: 55 },
      { priceListId: 'b', price: 10 },
    ]

    const overview = buildPriceListsOverview(lists, items)

    expect(overview.activeLists).toBe(1)
    expect(overview.totalItems).toBe(4)
    expect(overview.withPrice).toBe(3)
    expect(overview.withoutPrice).toBe(1)

    const varejo = overview.lists.find((l) => l.id === 'a')!
    expect(varejo.itemCount).toBe(2)
    expect(varejo.withPriceCount).toBe(1)
    expect(varejo.withoutPriceCount).toBe(1)

    const oficina = overview.lists.find((l) => l.id === 'b')!
    expect(oficina.itemCount).toBe(2)
    expect(oficina.withPriceCount).toBe(2)

    const draft = overview.lists.find((l) => l.id === 'c')!
    expect(draft.itemCount).toBe(0)
    expect(draft.withPriceCount).toBe(0)
  })

  it('aggregatePriceListItemCounts trata preço zero como sem preço', () => {
    const map = aggregatePriceListItemCounts([
      { priceListId: 'x', price: 0 },
      { priceListId: 'x', price: -1 },
      { priceListId: 'x', price: 1 },
    ])
    expect(map.get('x')).toEqual({ total: 3, withPrice: 1, withoutPrice: 2 })
  })
})

describe('F8.1-I labels e slug de cópia', () => {
  it('labels de status e método', () => {
    expect(priceListStatusLabel('active')).toBe('Ativa')
    expect(priceListStatusLabel('inactive')).toBe('Inativa')
    expect(priceListStatusLabel('draft')).toBe('Rascunho')
    expect(pricingMethodLabel('margin_on_sell')).toBe('Margem')
    expect(pricingMethodLabel('markup_on_cost')).toBe('Markup')
    expect(pricingMethodLabel('fixed')).toBe('Fixo')
  })

  it('regra: fixo —, margem %, markup como fator', () => {
    expect(pricingRuleLabel('fixed', 10)).toBe('—')
    expect(pricingRuleLabel('margin_on_sell', 35)).toBe('35%')
    expect(pricingRuleLabel('markup_on_cost', 50)).toBe('1,50')
  })

  it('nome e slug únicos na duplicação', () => {
    expect(formatDuplicatePriceListName('Varejo')).toBe('Varejo (cópia)')
    expect(formatDuplicatePriceListName('Varejo (cópia)')).toBe('Varejo (cópia)')
    expect(buildUniquePriceListSlug('varejo-copia', ['varejo'])).toBe('varejo-copia')
    expect(buildUniquePriceListSlug('varejo-copia', ['varejo-copia'])).toBe('varejo-copia-2')
    expect(buildUniquePriceListSlug('varejo-copia', ['varejo-copia', 'varejo-copia-2'])).toBe(
      'varejo-copia-3',
    )
  })
})
