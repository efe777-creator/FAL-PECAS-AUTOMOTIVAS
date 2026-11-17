import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest'
import {
  ADMIN_WORKSPACE_KEY,
  clampSplitWidth,
  readModulePrefs,
  writeModulePrefs,
  WORKSPACE_SPLIT_DEFAULT,
} from './adminWorkspacePrefs'

describe('adminWorkspacePrefs', () => {
  const store = new Map<string, string>()
  const touchedKeys: string[] = []

  beforeEach(() => {
    store.clear()
    touchedKeys.length = 0
    vi.stubGlobal('localStorage', {
      getItem: (k: string) => {
        touchedKeys.push(`get:${k}`)
        return store.get(k) ?? null
      },
      setItem: (k: string, v: string) => {
        touchedKeys.push(`set:${k}`)
        store.set(k, v)
      },
      removeItem: (k: string) => {
        touchedKeys.push(`remove:${k}`)
        store.delete(k)
      },
      clear: () => store.clear(),
    })
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('grava e lê prefs sem tocar no layout do dashboard', () => {
    writeModulePrefs('orders', { mode: 'split', splitWidthPx: 480 })
    expect(readModulePrefs('orders')).toEqual({ mode: 'split', splitWidthPx: 480 })
    expect(touchedKeys.every((k) => k.includes(ADMIN_WORKSPACE_KEY))).toBe(true)
    expect(touchedKeys.some((k) => k.includes('fal-admin-dashboard-layout-v1'))).toBe(
      false,
    )
  })

  it('clamp de largura', () => {
    expect(clampSplitWidth(100)).toBe(360)
    expect(clampSplitWidth(9999)).toBe(640)
    expect(clampSplitWidth(Number.NaN)).toBe(WORKSPACE_SPLIT_DEFAULT)
  })

  it('default collapsed', () => {
    expect(readModulePrefs('dashboard')).toEqual({
      mode: 'collapsed',
      splitWidthPx: WORKSPACE_SPLIT_DEFAULT,
    })
  })
})
