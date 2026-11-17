import { describe, expect, it, beforeEach, vi } from 'vitest'
import { readAdminTheme, toggleAdminTheme, writeAdminTheme } from './adminTheme'

const store = new Map<string, string>()

describe('adminTheme', () => {
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

  it('default is dark when unset', () => {
    expect(readAdminTheme()).toBe('dark')
  })

  it('persists light and dark', () => {
    writeAdminTheme('light')
    expect(readAdminTheme()).toBe('light')
    writeAdminTheme('dark')
    expect(readAdminTheme()).toBe('dark')
  })

  it('toggles between themes', () => {
    expect(toggleAdminTheme('dark')).toBe('light')
    expect(toggleAdminTheme('light')).toBe('dark')
  })
})
