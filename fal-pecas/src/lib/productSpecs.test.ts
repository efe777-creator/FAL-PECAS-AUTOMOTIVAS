import { describe, expect, it } from 'vitest'
import { buildProductSpecRows } from '@/lib/productSpecs'
import type { Product } from '@/types'

function base(over: Partial<Product> = {}): Product {
  return {
    id: 'p1',
    sku: 'SKU-1',
    commercialRef: 'BRD2109',
    name: 'Axial',
    slug: 'axial',
    price: 10,
    ...over,
  }
}

describe('buildProductSpecRows (MARCHA PDP-A)', () => {
  it('inclui referência e omite vazios', () => {
    const rows = buildProductSpecRows(base({ brand: 'Nakata', manufacturerCode: '  ' }))
    expect(rows.some((r) => r.label === 'Referência' && r.value === 'BRD2109')).toBe(true)
    expect(rows.some((r) => r.label === 'Fabricante')).toBe(true)
    expect(rows.some((r) => r.label === 'Cód. fabricante')).toBe(false)
  })

  it('attrs só com valor útil', () => {
    const rows = buildProductSpecRows(
      base({
        attrs: { material: 'Aço', vazio: '', nulo: null, weird: 'undefined' },
      }),
    )
    expect(rows.some((r) => r.label === 'material' && r.value === 'Aço')).toBe(true)
    expect(rows.some((r) => r.label === 'vazio')).toBe(false)
    expect(rows.some((r) => r.label === 'weird')).toBe(false)
  })
})
