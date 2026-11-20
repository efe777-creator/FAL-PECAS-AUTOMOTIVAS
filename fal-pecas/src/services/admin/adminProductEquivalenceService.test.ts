import { describe, expect, it } from 'vitest'
import { equivalencePairIds } from './adminProductEquivalenceService'

describe('equivalencePairIds E.6', () => {
  it('ordena estável independente da ordem de entrada', () => {
    expect(equivalencePairIds('b', 'a')).toEqual(['a', 'b'])
    expect(equivalencePairIds('a', 'b')).toEqual(['a', 'b'])
  })
})
