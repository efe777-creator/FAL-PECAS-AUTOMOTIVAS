import { describe, expect, it } from 'vitest'
import { parseCatalogProductKind } from '@/services/search/catalogProductKind'

describe('parseCatalogProductKind', () => {
  it('aceita kit e item', () => {
    expect(parseCatalogProductKind('kit')).toBe('kit')
    expect(parseCatalogProductKind('KIT')).toBe('kit')
    expect(parseCatalogProductKind(' item ')).toBe('item')
  })

  it('ignora valores inválidos', () => {
    expect(parseCatalogProductKind(null)).toBe('')
    expect(parseCatalogProductKind('')).toBe('')
    expect(parseCatalogProductKind('combo')).toBe('')
    expect(parseCatalogProductKind('kits')).toBe('')
  })
})
