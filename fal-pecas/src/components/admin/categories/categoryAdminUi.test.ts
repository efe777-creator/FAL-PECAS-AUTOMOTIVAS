import { describe, expect, it } from 'vitest'
import { categoryStatusLabel } from './categoryAdminUi'

describe('categoryStatusLabel', () => {
  it('rótulos PT-BR', () => {
    expect(categoryStatusLabel('archived')).toBe('Arquivado')
    expect(categoryStatusLabel('published')).toBe('Publicado')
    expect(categoryStatusLabel('draft')).toBe('Rascunho')
    expect(categoryStatusLabel(undefined)).toBe('—')
  })
})
