import { describe, expect, it } from 'vitest'
import { detectCsvDelimiter } from '@/services/import/delimiter'
import { getImportContract } from '@/services/import/contracts'
import { parseCsvToGrid } from '@/services/import/parseCsv'
import { validateImportGrid } from '@/services/import/validate'
import { splitCsvLine } from '@/services/import/csvSplit'
import { parsePriceCsv } from '@/services/admin/priceImportParser'
import {
  calculateSellPrice,
  computeCostTotal,
  effectiveMarginFraction,
  effectiveMarkupFraction,
  shouldRecalculatePriceOnCostChange,
  toPercent,
} from '@/services/pricing/pricingFormulas'

describe('detectCsvDelimiter', () => {
  it('prefere ponto-e-vírgula', () => {
    expect(detectCsvDelimiter('a;b\nc;d')).toBe(';')
  })

  it('detecta vírgula quando dominante', () => {
    expect(detectCsvDelimiter('a,b\nc,d\ne,f')).toBe(',')
  })

  it('detecta TAB', () => {
    expect(detectCsvDelimiter('a\tb\nc\td')).toBe('\t')
  })

  it('default ; em arquivo sem delimitador', () => {
    expect(detectCsvDelimiter('sozinho')).toBe(';')
  })
})

describe('splitCsvLine', () => {
  it('respeita aspas com delimitador interno', () => {
    expect(splitCsvLine('"a;b";c', ';')).toEqual(['a;b', 'c'])
  })
})

describe('catalog contract', () => {
  const contract = getImportContract('catalog')

  it('aceita codigo;descricao com cabeçalho', () => {
    const grid = parseCsvToGrid('codigo;descricao\nTDI1083;Pivo Suspensao\nTDI1084;Terminal', {
      contract,
    })
    const result = validateImportGrid(grid, contract)
    expect(result.validCount).toBe(2)
    expect(result.invalidCount).toBe(0)
    expect(result.mapped[0]?.values.sku).toBe('TDI1083')
    expect(result.mapped[0]?.values.name).toBe('Pivo Suspensao')
  })

  it('aceita sem cabeçalho (ordem do contrato)', () => {
    const grid = parseCsvToGrid('TDI1083;Pivo\nTDI1084;Terminal', { contract })
    const result = validateImportGrid(grid, contract)
    expect(result.ok).toBe(true)
    expect(result.mapped[0]?.values.sku).toBe('TDI1083')
  })

  it('bloqueia arquivo vazio', () => {
    const grid = parseCsvToGrid('', { contract })
    const result = validateImportGrid(grid, contract)
    expect(result.ok).toBe(false)
    expect(result.errors.some((e) => e.code === 'empty_file')).toBe(true)
  })

  it('bloqueia SKU duplicado no arquivo', () => {
    const grid = parseCsvToGrid('codigo;descricao\nTDI1083;A\nTDI1083;B', { contract })
    const result = validateImportGrid(grid, contract)
    expect(result.invalidCount).toBe(2)
    expect(result.errors.some((e) => e.code === 'duplicate_in_file')).toBe(true)
  })

  it('erro em campo obrigatório vazio', () => {
    const grid = parseCsvToGrid('codigo;descricao\n;SemCodigo\nTDI; ', { contract })
    const result = validateImportGrid(grid, contract)
    expect(result.invalidCount).toBeGreaterThan(0)
    expect(result.errors.some((e) => e.code === 'required_empty')).toBe(true)
  })
})

describe('price_list contract + compat parsePriceCsv', () => {
  it('parsePriceCsv compatível com F6B', () => {
    const rows = parsePriceCsv('sku;preco\nTDI1083;55,49\nTDI1084;42.90')
    expect(rows).toHaveLength(2)
    expect(rows[0]?.sku).toBe('TDI1083')
    expect(rows[0]?.price).toBe(55.49)
    expect(rows[1]?.price).toBe(42.9)
  })

  it('valida dinheiro inválido', () => {
    const contract = getImportContract('price_list')
    const grid = parseCsvToGrid('sku;preco\nTDI1083;abc', { contract })
    const result = validateImportGrid(grid, contract)
    expect(result.errors.some((e) => e.code === 'invalid_money')).toBe(true)
  })

  it('duplicata de SKU no arquivo de preço', () => {
    const contract = getImportContract('price_list')
    const grid = parseCsvToGrid('sku;preco\nTDI1083;10\nTDI1083;20', { contract })
    const result = validateImportGrid(grid, contract, { duplicateKeyField: 'sku' })
    expect(result.errors.some((e) => e.code === 'duplicate_in_file')).toBe(true)
  })

  it('arquivo vazio bloqueia', () => {
    const contract = getImportContract('price_list')
    const grid = parseCsvToGrid('', { contract })
    const result = validateImportGrid(grid, contract)
    expect(result.errors.some((e) => e.code === 'empty_file')).toBe(true)
  })
})

describe('supplier_conversion contract', () => {
  it('mapeia codigo_fal + codigo_fornecedor', () => {
    const contract = getImportContract('supplier_conversion')
    const grid = parseCsvToGrid(
      'codigo_fal;codigo_fornecedor\nTDI1083;ABC123\nTDI1084;ABC124',
      { contract },
    )
    const result = validateImportGrid(grid, contract)
    expect(result.ok).toBe(true)
    expect(result.mapped[0]?.values.supplier_sku).toBe('ABC123')
  })

  it('duplicata de supplier_sku no arquivo', () => {
    const contract = getImportContract('supplier_conversion')
    const grid = parseCsvToGrid(
      'codigo_fal;codigo_fornecedor\nTDI1083;ABC\nTDI1084;ABC',
      { contract },
    )
    const result = validateImportGrid(grid, contract, {
      duplicateKeyField: 'supplier_sku',
    })
    expect(result.errors.some((e) => e.code === 'duplicate_in_file')).toBe(true)
  })

  it('aceita sem cabeçalho na ordem do contrato', () => {
    const contract = getImportContract('supplier_conversion')
    const grid = parseCsvToGrid('TDI1083;ABC123', { contract })
    const result = validateImportGrid(grid, contract, {
      duplicateKeyField: 'supplier_sku',
    })
    expect(result.ok).toBe(true)
    expect(result.mapped[0]?.values.sku).toBe('TDI1083')
    expect(result.mapped[0]?.values.supplier_sku).toBe('ABC123')
  })
})

describe('supplier_cost contract', () => {
  it('parseia custo BR', () => {
    const contract = getImportContract('supplier_cost')
    const grid = parseCsvToGrid('codigo_fornecedor;custo\nABC123;40,00', { contract })
    const result = validateImportGrid(grid, contract, {
      duplicateKeyField: 'supplier_sku',
    })
    expect(result.ok).toBe(true)
    expect(result.mapped[0]?.values.cost).toBe('40,00')
  })

  it('erro em custo inválido', () => {
    const contract = getImportContract('supplier_cost')
    const grid = parseCsvToGrid('codigo_fornecedor;custo\nABC123;abc', { contract })
    const result = validateImportGrid(grid, contract, {
      duplicateKeyField: 'supplier_sku',
    })
    expect(result.errors.some((e) => e.code === 'invalid_money')).toBe(true)
  })

  it('duplicata de codigo fornecedor no arquivo', () => {
    const contract = getImportContract('supplier_cost')
    const grid = parseCsvToGrid(
      'codigo_fornecedor;custo\nABC;10\nABC;20',
      { contract },
    )
    const result = validateImportGrid(grid, contract, {
      duplicateKeyField: 'supplier_sku',
    })
    expect(result.errors.some((e) => e.code === 'duplicate_in_file')).toBe(true)
  })
})

describe('pricingFormulas (D6/D15/D16)', () => {
  it('custo_total = base + adicional item (+ lista)', () => {
    expect(computeCostTotal(40, 2, 0)).toBe(42)
    expect(computeCostTotal(40, 2, 1)).toBe(43)
  })

  it('markup 30% sobre 42 = 54.60', () => {
    expect(calculateSellPrice(42, 'markup_on_cost', 30)).toBe(54.6)
  })

  it('margem 30% sobre 42 = 60', () => {
    expect(calculateSellPrice(42, 'margin_on_sell', 30)).toBe(60)
  })

  it('50% markup ≠ 50% margem', () => {
    const cost = 100
    const markupPrice = calculateSellPrice(cost, 'markup_on_cost', 50)!
    const marginPrice = calculateSellPrice(cost, 'margin_on_sell', 50)!
    expect(markupPrice).toBe(150)
    expect(marginPrice).toBe(200)
    expect(toPercent(effectiveMarkupFraction(markupPrice, cost))).toBe(50)
    expect(toPercent(effectiveMarginFraction(marginPrice, cost))).toBe(50)
  })

  it('D16: só calculated recalcula', () => {
    expect(shouldRecalculatePriceOnCostChange('calculated')).toBe(true)
    expect(shouldRecalculatePriceOnCostChange('imported')).toBe(false)
    expect(shouldRecalculatePriceOnCostChange('manual')).toBe(false)
  })

  it('margem >= 100% retorna null', () => {
    expect(calculateSellPrice(100, 'margin_on_sell', 100)).toBeNull()
    expect(calculateSellPrice(100, 'margin_on_sell', 100.1)).toBeNull()
  })

  it('custo negativo / NaN impede cálculo', () => {
    expect(calculateSellPrice(-1, 'markup_on_cost', 30)).toBeNull()
    expect(calculateSellPrice(Number.NaN, 'margin_on_sell', 30)).toBeNull()
  })

  it('fixed não calcula por fórmula', () => {
    expect(calculateSellPrice(100, 'fixed', 30)).toBeNull()
  })

  it('list_extra no computeCostTotal é explícito (placeholder F8.1-E = 0 na prática)', () => {
    // UI/RPC usam list_extra=0; função pura ainda aceita o 3º arg para evolução
    expect(computeCostTotal(40, 2, 0)).toBe(42)
  })
})
