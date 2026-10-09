import { describe, expect, it } from 'vitest'
import {
  entityNamesMatch,
  findByEntityName,
  formatCatalogDisplayName,
  formatCategoryName,
  normalizeEntityMatchKey,
  toCommercialTitleCase,
} from '@/lib/entityNormalize'

describe('entityNormalize', () => {
  it('match key unifica case e acentos', () => {
    expect(normalizeEntityMatchKey('Chevrolet')).toBe('CHEVROLET')
    expect(normalizeEntityMatchKey('chevrolet')).toBe('CHEVROLET')
    expect(normalizeEntityMatchKey('  CHEVROLET  ')).toBe('CHEVROLET')
    expect(normalizeEntityMatchKey('Citroën')).toBe('CITROEN')
    expect(normalizeEntityMatchKey('Citroen')).toBe('CITROEN')
    expect(entityNamesMatch('PIVÔ', 'Pivo')).toBe(true)
  })

  it('categoria fica em maiúsculas pt-BR', () => {
    expect(formatCategoryName('  filtro de óleo  ')).toBe('FILTRO DE ÓLEO')
  })

  it('display de catálogo preserva casing e limpa espaços', () => {
    expect(formatCatalogDisplayName('  CAOA   Chery ')).toBe('CAOA Chery')
  })

  it('findByEntityName usa chave canônica', () => {
    const items = [{ id: '1', name: 'Chevrolet' }]
    expect(findByEntityName(items, 'CHEVROLET')?.id).toBe('1')
    expect(findByEntityName(items, 'chevrolet')?.id).toBe('1')
    expect(findByEntityName(items, 'Ford')).toBeUndefined()
  })

  it('title case comercial preserva siglas curtas e partículas', () => {
    expect(toCommercialTitleCase('AMORTECEDOR DIANTEIRO')).toBe('Amortecedor Dianteiro')
    expect(toCommercialTitleCase('BMW série 3')).toBe('BMW Série 3')
    expect(toCommercialTitleCase('TRW')).toBe('TRW')
    expect(normalizeEntityMatchKey('Amortecedor Dianteiro')).toBe(
      normalizeEntityMatchKey('AMORTECEDOR DIANTEIRO'),
    )
  })
})
