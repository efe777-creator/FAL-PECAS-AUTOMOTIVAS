import { describe, expect, it } from 'vitest'
import {
  buildApplicationSearchClause,
  mergeUniqueIds,
} from '@/services/admin/adminApplicationService'

describe('adminApplicationSearch', () => {
  it('mergeUniqueIds preserva ordem e remove duplicados', () => {
    expect(mergeUniqueIds(['a', 'b'], ['b', 'c'], [], null)).toEqual(['a', 'b', 'c'])
  })

  it('busca por q usa OR entre produto e veículo resolvidos', () => {
    expect(
      buildApplicationSearchClause({
        productIds: ['p1', 'p2'],
        versionIdsFromQ: ['v1'],
        versionIdsFromFilters: null,
      }),
    ).toEqual({
      kind: 'or',
      productIds: ['p1', 'p2'],
      versionIds: ['v1'],
    })
  })

  it('sem match de produto/veículo na busca q retorna empty', () => {
    expect(
      buildApplicationSearchClause({
        productIds: [],
        versionIdsFromQ: [],
        versionIdsFromFilters: null,
      }),
    ).toEqual({ kind: 'empty' })
  })

  it('filtro veicular cascata continua em AND com produtos da busca', () => {
    expect(
      buildApplicationSearchClause({
        productIds: ['p1'],
        versionIdsFromQ: ['v9'],
        versionIdsFromFilters: ['v1', 'v2'],
      }),
    ).toEqual({
      kind: 'and',
      productIds: ['p1'],
      versionIds: ['v1', 'v2'],
    })
  })
})
