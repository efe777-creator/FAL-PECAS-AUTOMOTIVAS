import { describe, expect, it } from 'vitest'
import { categoryChainById, categoryChainBySlug } from './categoryService'
import type { Category } from '@/types'

const cats: Category[] = [
  { id: 'c1', name: 'Motor', slug: 'motor', parentId: null, sortOrder: 1 },
  { id: 'g1', name: 'Filtros', slug: 'filtros', parentId: 'c1', sortOrder: 1 },
  { id: 's1', name: 'Óleo', slug: 'oleo', parentId: 'g1', sortOrder: 1 },
]

describe('categoryChainById', () => {
  it('monta Categoria → Grupo → Subgrupo', () => {
    expect(categoryChainById(cats, 's1').map((c) => c.slug)).toEqual([
      'motor',
      'filtros',
      'oleo',
    ])
  })

  it('retorna só a raiz quando é categoria', () => {
    expect(categoryChainById(cats, 'c1')).toEqual([
      { id: 'c1', name: 'Motor', slug: 'motor' },
    ])
  })

  it('retorna vazio se id inexistente', () => {
    expect(categoryChainById(cats, 'x')).toEqual([])
  })
})

describe('categoryChainBySlug', () => {
  it('resolve pelo slug da folha', () => {
    expect(categoryChainBySlug(cats, 'oleo').map((c) => c.name)).toEqual([
      'Motor',
      'Filtros',
      'Óleo',
    ])
  })
})
