import { describe, expect, it } from 'vitest'
import {
  MAIS_APLICACOES_LABEL,
  MENOS_APLICACOES_LABEL,
  REFERENCIA_LABEL,
  VER_PRODUTO_LABEL,
  formatReferenciaFromProduct,
  formatStorePriceLabel,
} from '@/lib/productLabels'

describe('productLabels (IMP-11 card)', () => {
  it('D1: Referência a partir de commercialRef com fallback sku', () => {
    expect(formatReferenciaFromProduct({ commercialRef: 'TRW1234', sku: 'SKU-1' })).toBe(
      'Referência: TRW1234',
    )
    expect(formatReferenciaFromProduct({ sku: 'SKU-1' })).toBe('Referência: SKU-1')
    expect(REFERENCIA_LABEL).toBe('Referência')
  })

  it('D3: CTA Ver produto', () => {
    expect(VER_PRODUTO_LABEL).toBe('Ver produto')
  })

  it('MARCHA UI: Mais / Menos aplicações', () => {
    expect(MAIS_APLICACOES_LABEL).toBe('Mais aplicações')
    expect(MENOS_APLICACOES_LABEL).toBe('Menos aplicações')
  })

  it('D2: A partir de só com listPrice > resolved', () => {
    expect(formatStorePriceLabel(50)).toBe('R$\u00a050,00')
    expect(formatStorePriceLabel(50, 50)).toBe('R$\u00a050,00')
    expect(formatStorePriceLabel(50, 49.99)).toBe('R$\u00a050,00')
    expect(formatStorePriceLabel(37.99, 50)).toMatch(/^A partir de /)
    expect(formatStorePriceLabel(37.99, 50)).toContain('37,99')
  })
})
