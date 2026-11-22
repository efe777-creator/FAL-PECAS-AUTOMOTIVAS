import { describe, expect, it } from 'vitest'
import { pickPromoHighlightShelf } from '@/lib/promoShelf'

const yes = () => true

describe('pickPromoHighlightShelf (Notes #13)', () => {
  it('prioriza gate e não duplica', () => {
    const gate = [
      { id: 'g1', productKind: 'item' },
      { id: 'g2', productKind: 'kit' },
    ]
    const pool = [
      { id: 'g1', productKind: 'item' },
      { id: 'h1', productKind: 'item' },
    ]
    expect(pickPromoHighlightShelf(gate, pool, 3, yes).map((p) => p.id)).toEqual([
      'g1',
      'g2',
      'h1',
    ])
  })

  it('intercala itens e kits no preenchimento', () => {
    const out = pickPromoHighlightShelf(
      [],
      [
        { id: 'i1', productKind: 'item' },
        { id: 'i2', productKind: 'item' },
        { id: 'k1', productKind: 'kit' },
        { id: 'k2', productKind: 'kit' },
      ],
      4,
      yes,
    )
    expect(out.map((p) => p.id)).toEqual(['i1', 'k1', 'i2', 'k2'])
  })

  it('respeita isPromo e o limite', () => {
    const out = pickPromoHighlightShelf(
      [{ id: 'bad', productKind: 'item' }],
      [
        { id: 'skip', productKind: 'item' },
        { id: 'ok', productKind: 'kit' },
      ],
      1,
      (p) => p.id === 'ok',
    )
    expect(out.map((p) => p.id)).toEqual(['ok'])
  })
})
