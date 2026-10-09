import { describe, expect, it } from 'vitest'
import {
  IMPORT_KINDS,
  importKindLabel,
  importStatusLabel,
  importWizardPath,
} from '@/lib/importLabels'

describe('importLabels (IMP-06)', () => {
  it('rótulos PT dos kinds conhecidos', () => {
    expect(importKindLabel('catalog')).toContain('Catálogo')
    expect(importKindLabel('catalog_applications')).toBe('Aplicações')
    expect(importKindLabel('supplier_cost')).toContain('Custos')
    expect(importKindLabel('price_list')).toContain('Lista')
    expect(IMPORT_KINDS).toHaveLength(5)
  })

  it('status operacional', () => {
    expect(importStatusLabel('done')).toBe('Concluída')
    expect(importStatusLabel('preview')).toBe('Pré-visualização')
    expect(importStatusLabel('failed')).toBe('Falhou')
  })

  it('wizards mapeados', () => {
    expect(importWizardPath('catalog')).toBe('/admin/produtos/importar')
    expect(importWizardPath('supplier_cost')).toBe('/admin/fornecedores/importar-custos')
    expect(importWizardPath('price_list')).toBe('/admin/precos')
    expect(importWizardPath('unknown')).toBeNull()
  })
})
