import { describe, expect, it } from 'vitest'
import { reduceOrderSplitTabs } from '@/hooks/useOrderSplitTabs'

describe('reduceOrderSplitTabs — empilhar guias', () => {
  it('clique 1 abre; clique 2 empilha; clique no mesmo só foca', () => {
    let s = { openOrderIds: [] as string[], activeOrderId: null as string | null }
    s = reduceOrderSplitTabs(s, { type: 'open', orderId: 'aaa' })
    expect(s).toEqual({ openOrderIds: ['aaa'], activeOrderId: 'aaa' })

    s = reduceOrderSplitTabs(s, { type: 'open', orderId: 'bbb' })
    expect(s).toEqual({ openOrderIds: ['aaa', 'bbb'], activeOrderId: 'bbb' })

    s = reduceOrderSplitTabs(s, { type: 'open', orderId: 'ccc' })
    expect(s.openOrderIds).toEqual(['aaa', 'bbb', 'ccc'])
    expect(s.activeOrderId).toBe('ccc')

    s = reduceOrderSplitTabs(s, { type: 'open', orderId: 'aaa' })
    expect(s.openOrderIds).toEqual(['aaa', 'bbb', 'ccc'])
    expect(s.activeOrderId).toBe('aaa')
  })

  it('fechar guia individual mantém as outras', () => {
    let s = { openOrderIds: ['a', 'b', 'c'], activeOrderId: 'b' }
    s = reduceOrderSplitTabs(s, { type: 'close', orderId: 'b' })
    expect(s.openOrderIds).toEqual(['a', 'c'])
    expect(s.activeOrderId).toBe('c')

    s = reduceOrderSplitTabs(s, { type: 'close', orderId: 'a' })
    expect(s).toEqual({ openOrderIds: ['c'], activeOrderId: 'c' })

    s = reduceOrderSplitTabs(s, { type: 'close', orderId: 'c' })
    expect(s).toEqual({ openOrderIds: [], activeOrderId: null })
  })
})
