import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest'
import { peekOrdersReturnPath, rememberOrdersReturnPath } from './adminOrdersNav'

describe('adminOrdersNav (UI-04 / CEN-04)', () => {
  const store = new Map<string, string>()

  beforeEach(() => {
    store.clear()
    vi.stubGlobal('sessionStorage', {
      getItem: (k: string) => store.get(k) ?? null,
      setItem: (k: string, v: string) => {
        store.set(k, v)
      },
      removeItem: (k: string) => {
        store.delete(k)
      },
      clear: () => store.clear(),
    })
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('lembra path de área e ignora detalhe UUID', () => {
    rememberOrdersReturnPath('/admin/pedidos/analise')
    expect(peekOrdersReturnPath()).toBe('/admin/pedidos/analise')
    rememberOrdersReturnPath('/admin/pedidos/aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee')
    expect(peekOrdersReturnPath()).toBe('/admin/pedidos/analise')
  })

  it('fallback hub', () => {
    expect(peekOrdersReturnPath('/admin/pedidos')).toBe('/admin/pedidos')
  })
})
