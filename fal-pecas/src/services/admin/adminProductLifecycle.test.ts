import { describe, expect, it } from 'vitest'
import {
  DEFAULT_PRODUCT_LIST_LIFECYCLE,
  productLifecycleChipLabel,
  resolveProductStatusQuery,
} from './adminProductLifecycle'

describe('resolveProductStatusQuery', () => {
  it('padrão sem params = só ativos (≠ archived)', () => {
    expect(resolveProductStatusQuery({})).toEqual({ kind: 'neq', status: 'archived' })
    expect(
      resolveProductStatusQuery({ lifecycle: DEFAULT_PRODUCT_LIST_LIFECYCLE }),
    ).toEqual({ kind: 'neq', status: 'archived' })
  })

  it('só inativos = archived', () => {
    expect(
      resolveProductStatusQuery({
        lifecycle: { showActive: false, showInactive: true },
      }),
    ).toEqual({ kind: 'eq', status: 'archived' })
  })

  it('ativos + inativos = sem filtro de status', () => {
    expect(
      resolveProductStatusQuery({
        lifecycle: { showActive: true, showInactive: true },
      }),
    ).toEqual({ kind: 'none' })
  })

  it('nenhum ciclo = lista vazia', () => {
    expect(
      resolveProductStatusQuery({
        lifecycle: { showActive: false, showInactive: false },
      }),
    ).toEqual({ kind: 'empty' })
  })

  it('status explícito tem prioridade (pickers)', () => {
    expect(resolveProductStatusQuery({ status: 'published' })).toEqual({
      kind: 'eq',
      status: 'published',
    })
    expect(
      resolveProductStatusQuery({
        status: 'archived',
        lifecycle: DEFAULT_PRODUCT_LIST_LIFECYCLE,
      }),
    ).toEqual({ kind: 'eq', status: 'archived' })
  })
})

describe('productLifecycleChipLabel', () => {
  it('padrão não gera chip', () => {
    expect(productLifecycleChipLabel(DEFAULT_PRODUCT_LIST_LIFECYCLE)).toBeNull()
  })

  it('desvios do padrão geram chip', () => {
    expect(
      productLifecycleChipLabel({ showActive: false, showInactive: true }),
    ).toBe('Só inativos')
    expect(
      productLifecycleChipLabel({ showActive: true, showInactive: true }),
    ).toBe('Ativos + inativos')
  })
})
