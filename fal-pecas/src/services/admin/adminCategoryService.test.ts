import { describe, expect, it } from 'vitest'
import {
  allowedCategoryParents,
  categoryDepth,
  categoryLevelLabel,
  categoryPath,
  collectCategorySubtreeIds,
  resolveCategoryDefaultMeasures,
  CATEGORY_MAX_DEPTH,
} from '@/services/admin/adminCategoryService'
import type { Category } from '@/types'

function cat(
  id: string,
  name: string,
  parentId: string | null = null,
): Category {
  return {
    id,
    name,
    slug: id,
    parentId,
    sortOrder: 0,
    status: 'published',
  }
}

describe('category hierarchy (3 níveis)', () => {
  const items = [
    cat('g1', 'SUSPENSÃO'),
    cat('c1', 'BANDEJA', 'g1'),
    cat('s1', 'BANDEJA S/PIVO', 'c1'),
    cat('s2', 'BANDEJA COMPLETA', 'c1'),
  ]

  it('depth Categoria/Grupo/Subgrupo (planilha)', () => {
    expect(categoryDepth(items, 'g1')).toBe(1)
    expect(categoryDepth(items, 'c1')).toBe(2)
    expect(categoryDepth(items, 's1')).toBe(3)
    expect(categoryLevelLabel(1)).toBe('Categoria')
    expect(categoryLevelLabel(2)).toBe('Grupo')
    expect(categoryLevelLabel(3)).toBe('Subgrupo')
    expect(CATEGORY_MAX_DEPTH).toBe(3)
  })

  it('path', () => {
    expect(categoryPath(items, 's1')).toBe('SUSPENSÃO / BANDEJA / BANDEJA S/PIVO')
  })

  it('pais permitidos excluem subgrupo (bloqueia 4º nível)', () => {
    const parents = allowedCategoryParents(items)
    expect(parents.map((p) => p.id).sort()).toEqual(['c1', 'g1'])
    expect(parents.some((p) => p.id === 's1')).toBe(false)
  })

  it('pai de Grupo = só Categoria; pai de Subgrupo = só Grupo', () => {
    const all = allowedCategoryParents(items)
    const forGrupo = all.filter((p) => categoryDepth(items, p.id) === 1)
    const forSubgrupo = all.filter((p) => categoryDepth(items, p.id) === 2)
    expect(forGrupo.map((p) => p.id)).toEqual(['g1'])
    expect(forSubgrupo.map((p) => p.id)).toEqual(['c1'])
  })

  it('subtree inclui nó + descendentes', () => {
    expect(collectCategorySubtreeIds(items, 'g1').sort()).toEqual(['c1', 'g1', 's1', 's2'])
    expect(collectCategorySubtreeIds(items, 'c1').sort()).toEqual(['c1', 's1', 's2'])
    expect(collectCategorySubtreeIds(items, 's1')).toEqual(['s1'])
    expect(collectCategorySubtreeIds(items, 'missing')).toEqual([])
  })

  it('labels de nível Categoria/Grupo/Subgrupo', () => {
    expect(categoryLevelLabel(categoryDepth(items, 'g1'))).toBe('Categoria')
    expect(categoryLevelLabel(categoryDepth(items, 'c1'))).toBe('Grupo')
    expect(categoryLevelLabel(categoryDepth(items, 's1'))).toBe('Subgrupo')
  })
})

describe('resolveCategoryDefaultMeasures', () => {
  it('usa o próprio nó quando tem padrão', () => {
    const items: Category[] = [
      {
        ...cat('root', 'SUSPENSÃO'),
        defaultWeightKg: 0.4,
        defaultLengthCm: 10,
        defaultWidthCm: 8,
        defaultHeightCm: 12,
      },
      cat('leaf', 'BIELETA', 'root'),
    ]
    items[1] = {
      ...items[1],
      defaultWeightKg: 0.5,
      defaultLengthCm: 6,
      defaultWidthCm: 8,
      defaultHeightCm: 35,
    }
    const r = resolveCategoryDefaultMeasures(items, 'leaf')
    expect(r.sourceCategoryId).toBe('leaf')
    expect(r.weightKg).toBe(0.5)
  })

  it('sobe para o pai quando o nó está vazio', () => {
    const items: Category[] = [
      {
        ...cat('root', 'SUSPENSÃO'),
        defaultWeightKg: 0.44,
        defaultLengthCm: 7.6,
        defaultWidthCm: 10,
        defaultHeightCm: 17.8,
      },
      cat('leaf', 'PARCIAL', 'root'),
    ]
    const r = resolveCategoryDefaultMeasures(items, 'leaf')
    expect(r.sourceCategoryId).toBe('root')
    expect(r.weightKg).toBe(0.44)
    expect(r.lengthCm).toBe(7.6)
  })

  it('retorna vazio se a cadeia não tem padrão', () => {
    const items = [cat('root', 'FILTROS'), cat('leaf', 'FILTRO DE ÓLEO', 'root')]
    const r = resolveCategoryDefaultMeasures(items, 'leaf')
    expect(r.sourceCategoryId).toBeNull()
    expect(r.weightKg).toBeNull()
  })
})
