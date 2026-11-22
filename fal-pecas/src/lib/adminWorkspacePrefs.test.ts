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
    writeModulePrefs('orders', {
      mode: 'split',
      splitWidthPx: 480,
      guideDensity: 'compact',
    })
    expect(readModulePrefs('orders')).toEqual({
      mode: 'split',
      splitWidthPx: 480,
      guideDensity: 'compact',
    })
    expect(touchedKeys.every((k) => k.includes(ADMIN_WORKSPACE_KEY))).toBe(true)
    expect(touchedKeys.some((k) => k.includes('fal-admin-dashboard-layout'))).toBe(
      false,
    )
  })

  it('clamp de largura', () => {
    expect(clampSplitWidth(100)).toBe(360)
    expect(clampSplitWidth(9999)).toBe(920)
    expect(clampSplitWidth(800)).toBe(800)
    expect(clampSplitWidth(Number.NaN)).toBe(WORKSPACE_SPLIT_DEFAULT)
  })

  it('default collapsed', () => {
    expect(readModulePrefs('dashboard')).toEqual({
      mode: 'collapsed',
      splitWidthPx: WORKSPACE_SPLIT_DEFAULT,
      guideDensity: 'comfortable',
    })
  })

  it('persiste prefs de catálogo Adaptive incl. inventory e customers', () => {
    writeModulePrefs('products', {
      mode: 'expanded',
      splitWidthPx: 400,
      guideDensity: 'comfortable',
    })
    writeModulePrefs('kits', { mode: 'split', splitWidthPx: 500, guideDensity: 'comfortable' })
    writeModulePrefs('prices', {
      mode: 'fullscreen',
      splitWidthPx: 420,
      guideDensity: 'compact',
    })
    writeModulePrefs('applications', {
      mode: 'split',
      splitWidthPx: 440,
      guideDensity: 'comfortable',
    })
    writeModulePrefs('categories', {
      mode: 'split',
      splitWidthPx: 460,
      guideDensity: 'comfortable',
    })
    writeModulePrefs('promotions', {
      mode: 'split',
      splitWidthPx: 480,
      guideDensity: 'comfortable',
    })
    writeModulePrefs('inventory', {
      mode: 'split',
      splitWidthPx: 440,
      guideDensity: 'comfortable',
    })
    writeModulePrefs('customers', {
      mode: 'split',
      splitWidthPx: 420,
      guideDensity: 'comfortable',
    })
    expect(readModulePrefs('products').mode).toBe('expanded')
    expect(readModulePrefs('kits').splitWidthPx).toBe(500)
    expect(readModulePrefs('prices').mode).toBe('fullscreen')
    expect(readModulePrefs('prices').guideDensity).toBe('compact')
    expect(readModulePrefs('applications').mode).toBe('split')
    expect(readModulePrefs('categories').mode).toBe('split')
    expect(readModulePrefs('promotions').mode).toBe('split')
    expect(readModulePrefs('inventory').mode).toBe('split')
    expect(readModulePrefs('customers').mode).toBe('split')
    expect(readModulePrefs('orders').mode).toBe('collapsed')
  })

  it('migra prefs antigas sem guideDensity para comfortable', () => {
    store.set(
      ADMIN_WORKSPACE_KEY,
      JSON.stringify({
        version: 1,
        updatedAt: new Date().toISOString(),
        modules: { orders: { mode: 'split', splitWidthPx: 500 } },
      }),
    )
    expect(readModulePrefs('orders').guideDensity).toBe('comfortable')
    expect(readModulePrefs('orders').splitWidthPx).toBe(500)
  })
})
