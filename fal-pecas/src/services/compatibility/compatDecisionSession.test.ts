import { describe, expect, it } from 'vitest'
import type { CompatibilityVerdict } from '@/services/compatibility/compatibilityEngine'
import {
  buildCompatDecisionEntries,
  compatGateDialogCopy,
} from './compatDecisionSession'

const similar: CompatibilityVerdict = {
  state: 'probable',
  label: 'x',
  evidences: [{ code: 'maker_model_only', detail: 'Só montadora/modelo' }],
}

const incompat: CompatibilityVerdict = {
  state: 'unconfirmed',
  label: 'x',
  evidences: [
    { code: 'no_intersection', detail: 'Nenhuma aplicação PVC cruza com o veículo informado' },
  ],
}

describe('compatDecisionSession E.4', () => {
  it('monta entradas só para não confirmados', () => {
    const map = new Map<string, CompatibilityVerdict>([
      ['a', similar],
      [
        'b',
        {
          state: 'confirmed',
          label: 'ok',
          evidences: [],
        },
      ],
      ['c', incompat],
    ])
    const entries = buildCompatDecisionEntries(
      [
        { productId: 'a', name: 'Pastilha', sku: 'P1' },
        { productId: 'b', name: 'Filtro', sku: 'F1' },
        { productId: 'c', name: 'Amortecedor', sku: 'A1' },
      ],
      map,
    )
    expect(entries).toHaveLength(2)
    expect(entries.map((e) => e.productId).sort()).toEqual(['a', 'c'])
    expect(entries.find((e) => e.productId === 'c')?.action).toBe('continue_incompatible')
  })

  it('copy do gate distingue incompatível', () => {
    const entries = buildCompatDecisionEntries(
      [{ productId: 'c', name: 'Amortecedor', sku: 'A1' }],
      new Map([['c', incompat]]),
    )
    const copy = compatGateDialogCopy(entries)
    expect(copy.title).toMatch(/incompatível/i)
    expect(copy.confirmLabel).toMatch(/mesmo assim/i)
  })
})
