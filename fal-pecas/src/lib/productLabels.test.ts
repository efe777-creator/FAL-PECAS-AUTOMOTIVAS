import { describe, expect, it } from 'vitest'
import {
  ADICIONAR_AO_CARRINHO_LABEL,
  AJUDA_APLICACAO_TEXT,
  DESCRICAO_SECTION_LABEL,
  ESPECIFICACOES_SECTION_LABEL,
  FILTRAR_NO_CATALOGO_LABEL,
  MAIS_APLICACOES_LABEL,
  MENOS_APLICACOES_LABEL,
  REFERENCIA_LABEL,
  RELACIONADOS_SECTION_LABEL,
  VER_DESCRICAO_COMPLETA_LABEL,
  VER_MAIS_CATALOGO_LABEL,
  VER_MENOS_DESCRICAO_LABEL,
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

  it('D3: CTA Ver produto + Adicionar ao carrinho', () => {
    expect(VER_PRODUTO_LABEL).toBe('Ver produto')
    expect(ADICIONAR_AO_CARRINHO_LABEL).toBe('Adicionar ao carrinho')
  })

  it('MARCHA UI: Mais / Menos aplicações', () => {
    expect(MAIS_APLICACOES_LABEL).toBe('Mais aplicações')
    expect(MENOS_APLICACOES_LABEL).toBe('Menos aplicações')
  })

  it('MARCHA PDP-A: seções descrição / specs / ajuda', () => {
    expect(DESCRICAO_SECTION_LABEL).toBe('Descrição')
    expect(ESPECIFICACOES_SECTION_LABEL).toBe('Especificações')
    expect(AJUDA_APLICACAO_TEXT.length).toBeGreaterThan(20)
  })

  it('MARCHA PDP-C: descrição expansível / filtrar catálogo', () => {
    expect(VER_DESCRICAO_COMPLETA_LABEL).toBe('Ver descrição completa')
    expect(VER_MENOS_DESCRICAO_LABEL).toBe('Ver menos')
    expect(FILTRAR_NO_CATALOGO_LABEL).toBe('Filtrar no catálogo')
  })

  it('MARCHA PDP-D: relacionados por categoria', () => {
    expect(RELACIONADOS_SECTION_LABEL).toBe('Produtos relacionados')
    expect(VER_MAIS_CATALOGO_LABEL).toBe('Ver mais no catálogo')
  })

  it('D2: A partir de só com listPrice > resolved', () => {
    expect(formatStorePriceLabel(50)).toBe('R$\u00a050,00')
    expect(formatStorePriceLabel(50, 50)).toBe('R$\u00a050,00')
    expect(formatStorePriceLabel(50, 49.99)).toBe('R$\u00a050,00')
    expect(formatStorePriceLabel(37.99, 50)).toMatch(/^A partir de /)
    expect(formatStorePriceLabel(37.99, 50)).toContain('37,99')
  })
})
