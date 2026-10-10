import { describe, expect, it } from 'vitest'
import {
  entityNamesMatch,
  findByEntityName,
  formatCatalogDisplayName,
  formatCategoryName,
  formatManufacturerDisplayName,
  formatModelDisplayName,
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

  it('remove U+FFFD (encoding quebrado) do display e da match key', () => {
    expect(formatCatalogDisplayName('DOBL\uFFFD')).toBe('DOBL')
    expect(normalizeEntityMatchKey('DOBL\uFFFD')).toBe('DOBL')
    expect(normalizeEntityMatchKey('PR\uFFFDMIO')).toBe('PRMIO')
    expect(entityNamesMatch('DOBLÒ', 'Doblo')).toBe(true)
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
    expect(toCommercialTitleCase('Mercedes-Benz')).toBe('Mercedes-Benz')
    expect(normalizeEntityMatchKey('Amortecedor Dianteiro')).toBe(
      normalizeEntityMatchKey('AMORTECEDOR DIANTEIRO'),
    )
  })

  it('montadora: Ford (não FORD); preserva BMW/BYD/SEAT/CAOA', () => {
    expect(formatManufacturerDisplayName('FORD')).toBe('Ford')
    expect(formatManufacturerDisplayName('ford')).toBe('Ford')
    expect(formatManufacturerDisplayName('BMW')).toBe('BMW')
    expect(formatManufacturerDisplayName('BYD')).toBe('BYD')
    expect(formatManufacturerDisplayName('SEAT')).toBe('SEAT')
    expect(formatManufacturerDisplayName('CAOA CHERY')).toBe('CAOA Chery')
    expect(formatManufacturerDisplayName('Mercedes-Benz')).toBe('Mercedes-Benz')
  })

  it('modelo: title case com códigos preservados', () => {
    expect(formatModelDisplayName('ECOSPORT')).toBe('Ecosport')
    expect(formatModelDisplayName('NEW KA')).toBe('New Ka')
    expect(formatModelDisplayName('PREMIO')).toBe('Premio')
    expect(formatModelDisplayName('T-CROSS')).toBe('T-Cross')
    expect(formatModelDisplayName('CR-V')).toBe('CR-V')
    expect(formatModelDisplayName('HB20')).toBe('HB20')
    expect(formatModelDisplayName('C4 PALLAS')).toBe('C4 Pallas')
    expect(formatModelDisplayName('QQ')).toBe('QQ')
    expect(formatModelDisplayName('A3')).toBe('A3')
    expect(formatModelDisplayName('CROSS UP!')).toBe('Cross Up!')
  })
})
