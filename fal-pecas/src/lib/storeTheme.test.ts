import { describe, expect, it, beforeEach, vi } from 'vitest'
import { readStoreTheme, toggleStoreTheme, writeStoreTheme } from './storeTheme'

const store = new Map<string, string>()

describe('storeTheme', () => {
  beforeEach(() => {
    store.clear()
    vi.stubGlobal('localStorage', {
      getItem: (k: string) => store.get(k) ?? null,
      setItem: (k: string, v: string) => {
        store.set(k, v)
      },
      removeItem: (k: string) => {
        store.delete(k)
      },
      clear: () => store.clear(),
      key: () => null,
      length: 0,
    })
  })

  it('default is light when unset', () => {
    expect(readStoreTheme()).toBe('light')
  })

  it('persists light and dark', () => {
    writeStoreTheme('dark')
    expect(readStoreTheme()).toBe('dark')
    writeStoreTheme('light')
    expect(readStoreTheme()).toBe('light')
  })

  it('toggles between themes', () => {
    expect(toggleStoreTheme('light')).toBe('dark')
    expect(toggleStoreTheme('dark')).toBe('light')
  })
})
