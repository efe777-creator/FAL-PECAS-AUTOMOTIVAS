import { describe, expect, it } from 'vitest'
import { expandSearchQuery, synonymMapFromRows } from './searchQueryExpand'

describe('expandSearchQuery', () => {
  const map = synonymMapFromRows([
    { term: 'shock', expandsTo: 'amortecedor' },
    { term: 'barra axial', expandsTo: 'axial' },
    { term: 'disco freio', expandsTo: 'disco' },
  ])

  it('não altera sem mapa', () => {
    expect(expandSearchQuery('shock', null)).toBe('shock')
  })

  it('substitui token', () => {
    expect(expandSearchQuery('shock dianteiro', map)).toBe('amortecedor dianteiro')
  })

  it('preferência por frase', () => {
    expect(expandSearchQuery('barra axial gol', map)).toBe('axial gol')
    expect(expandSearchQuery('disco freio', map)).toBe('disco')
  })
})
