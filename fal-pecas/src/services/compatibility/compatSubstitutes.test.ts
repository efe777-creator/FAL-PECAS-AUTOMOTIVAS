import { describe, expect, it } from 'vitest'
import type { CompatibilityVerdict } from '@/services/compatibility/compatibilityEngine'
import type { Product } from '@/types'
import { filterSubstituteCandidates } from './compatSubstitutes'

function product(id: string, name: string): Product {
  return {
    id,
    sku: id,
    name,
    slug: id,
    price: 10,
    status: 'published',
  } as Product
}

const confirmed: CompatibilityVerdict = {
  state: 'confirmed',
  label: 'ok',
  evidences: [{ code: 'year', detail: 'Ano ok' }],
}

const similar: CompatibilityVerdict = {
  state: 'probable',
  label: 'ok',
  evidences: [{ code: 'maker_model_only', detail: 'Só MM' }],
}

const check: CompatibilityVerdict = {
  state: 'unconfirmed',
  label: 'x',
  evidences: [{ code: 'no_pvc', detail: 'Sem PVC' }],
}

const hide: CompatibilityVerdict = {
  state: 'unconfirmed',
  label: 'x',
  evidences: [{ code: 'no_intersection', detail: 'Sem cruzamento' }],
}

describe('filterSubstituteCandidates M32', () => {
  it('mantém só Compatível/similar e ordena', () => {
    const out = filterSubstituteCandidates(
      [
        { product: product('a', 'A verificar'), verdict: check },
        { product: product('b', 'Similar'), verdict: similar },
        { product: product('c', 'Hide'), verdict: hide },
        { product: product('d', 'Compat'), verdict: confirmed },
      ],
      { excludeIds: new Set(), limit: 8 },
    )
    expect(out.map((x) => x.product.id)).toEqual(['d', 'b'])
    expect(out[0].sealKind).toBe('compatible')
    expect(out[1].sealKind).toBe('similar')
  })

  it('exclui ids e respeita limite', () => {
    const out = filterSubstituteCandidates(
      [
        { product: product('d', 'Compat'), verdict: confirmed },
        { product: product('b', 'Similar'), verdict: similar },
      ],
      { excludeIds: new Set(['d']), limit: 1 },
    )
    expect(out).toHaveLength(1)
    expect(out[0].product.id).toBe('b')
  })

  it('prioriza equivalentes E.6 antes do selo', () => {
    const out = filterSubstituteCandidates(
      [
        { product: product('d', 'Compat cat'), verdict: confirmed },
        { product: product('e', 'Similar equiv'), verdict: similar },
      ],
      { excludeIds: new Set(), preferredIds: new Set(['e']), limit: 8 },
    )
    expect(out.map((x) => x.product.id)).toEqual(['e', 'd'])
    expect(out[0].fromEquivalence).toBe(true)
  })
})
