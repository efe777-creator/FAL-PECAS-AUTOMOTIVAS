import { describe, expect, it } from 'vitest'
import type { ImportPreviewRow } from './adminPriceListService'
import {
  classifyPriceImportAction,
  filterRowsForImportMode,
  summarizePriceImportActions,
} from './priceImportActions'

function row(partial: Partial<ImportPreviewRow>): ImportPreviewRow {
  return {
    line: 1,
    sku: 'FAL001',
    price: 10,
    currentPrice: null,
    currentOrigin: null,
    productId: 'p1',
    errors: [],
    warnings: [],
    ok: true,
    ...partial,
  }
}

describe('classifyPriceImportAction', () => {
  it('classifica ações da prévia', () => {
    expect(classifyPriceImportAction(row({ ok: false, errors: ['x'] }))).toBe('error')
    expect(classifyPriceImportAction(row({ productId: null }))).toBe('not_found')
    expect(classifyPriceImportAction(row({ currentPrice: null }))).toBe('add')
    expect(classifyPriceImportAction(row({ currentPrice: 10, price: 10 }))).toBe('unchanged')
    expect(classifyPriceImportAction(row({ currentPrice: 9, price: 10 }))).toBe('update')
  })
})

describe('filterRowsForImportMode', () => {
  it('modo update só mantém ok em atualizações', () => {
    const rows = [
      row({ line: 1, currentPrice: 5, price: 10 }),
      row({ line: 2, currentPrice: null, price: 10 }),
    ]
    const filtered = filterRowsForImportMode(rows, 'update')
    expect(filtered[0]!.ok).toBe(true)
    expect(filtered[1]!.ok).toBe(false)
  })

  it('modo add só mantém ausentes da lista', () => {
    const rows = [
      row({ line: 1, currentPrice: 5, price: 10 }),
      row({ line: 2, currentPrice: null, price: 10 }),
    ]
    const filtered = filterRowsForImportMode(rows, 'add')
    expect(filtered[0]!.ok).toBe(false)
    expect(filtered[1]!.ok).toBe(true)
  })
})

describe('summarizePriceImportActions', () => {
  it('conta ações', () => {
    const s = summarizePriceImportActions([
      row({ line: 1, currentPrice: 5, price: 10 }),
      row({ line: 2, currentPrice: null }),
      row({ line: 3, currentPrice: 10, price: 10 }),
      row({ line: 4, productId: null, ok: false, errors: ['SKU'] }),
    ])
    expect(s.update).toBe(1)
    expect(s.add).toBe(1)
    expect(s.unchanged).toBe(1)
    expect(s.error).toBe(1)
  })
})
