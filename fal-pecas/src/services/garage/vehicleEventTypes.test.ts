import { describe, expect, it } from 'vitest'
import { g7TypeToCategory } from './vehicleEventTypes'

describe('g7TypeToCategory', () => {
  it('não confunde compra com instalação', () => {
    expect(g7TypeToCategory('bought')).toBe('compra_pecas')
    expect(g7TypeToCategory('associated')).toBe('compra_pecas')
    expect(g7TypeToCategory('awaiting_install')).toBe('compra_pecas')
    expect(g7TypeToCategory('installed_declared')).toBe('instalacao')
  })
})
