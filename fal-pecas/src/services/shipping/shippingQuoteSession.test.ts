import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import {
  clearShippingQuoteHandoff,
  loadShippingQuoteHandoff,
  saveShippingQuoteHandoff,
} from '@/services/shipping/shippingQuoteSession'

function installMemorySessionStorage() {
  const store = new Map<string, string>()
  const api = {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => {
      store.set(k, v)
    },
    removeItem: (k: string) => {
      store.delete(k)
    },
    clear: () => store.clear(),
    key: (i: number) => [...store.keys()][i] ?? null,
    get length() {
      return store.size
    },
  }
  Object.defineProperty(globalThis, 'sessionStorage', {
    value: api,
    configurable: true,
    writable: true,
  })
}

beforeEach(() => {
  installMemorySessionStorage()
})

afterEach(() => {
  clearShippingQuoteHandoff()
})

describe('shippingQuoteSession', () => {
  it('salva e carrega handoff de CEP', () => {
    saveShippingQuoteHandoff({ postalCode: '01310-100', preferredOptionId: 'mock:economic' })
    const h = loadShippingQuoteHandoff()
    expect(h?.postalCode).toBe('01310100')
    expect(h?.preferredOptionId).toBe('mock:economic')
  })

  it('rejeita CEP inválido no load', () => {
    sessionStorage.setItem(
      'fal.shippingQuoteHandoff.v1',
      JSON.stringify({ postalCode: '123', savedAt: new Date().toISOString() }),
    )
    expect(loadShippingQuoteHandoff()).toBeNull()
  })
})
