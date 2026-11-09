import { describe, expect, it } from 'vitest'
import {
  isPriceListItemPriced,
  PRICE_LIST_LAYERS_HINT,
  PRICE_ORIGIN_VS_METHOD_HINT,
  priceListItemPricingStateLabel,
  priceOriginLabel,
} from '@/lib/priceLabels'

describe('priceLabels (DIV-001 B)', () => {
  it('com preço só se price > 0', () => {
    expect(isPriceListItemPriced(10)).toBe(true)
    expect(isPriceListItemPriced(0)).toBe(false)
    expect(isPriceListItemPriced(-1)).toBe(false)
    expect(isPriceListItemPriced(null)).toBe(false)
    expect(isPriceListItemPriced(undefined)).toBe(false)
  })

  it('rótulos de estado do item', () => {
    expect(priceListItemPricingStateLabel(1)).toBe('Com preço')
    expect(priceListItemPricingStateLabel(0)).toBe('Sem preço')
  })

  it('origem em PT', () => {
    expect(priceOriginLabel('calculated')).toBe('Calculado')
    expect(priceOriginLabel('imported')).toBe('Importado')
    expect(priceOriginLabel('manual')).toBe('Manual')
  })

  it('hints admin sem símbolo ≠', () => {
    expect(PRICE_LIST_LAYERS_HINT).not.toMatch(/≠/)
    expect(PRICE_ORIGIN_VS_METHOD_HINT).not.toMatch(/≠/)
    expect(PRICE_LIST_LAYERS_HINT).toMatch(/não é o mesmo que/i)
    expect(PRICE_ORIGIN_VS_METHOD_HINT).toMatch(/não é o método/i)
  })
})
