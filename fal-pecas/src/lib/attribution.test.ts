import { describe, expect, it } from 'vitest'
import {
  ATTRIBUTION_STORAGE_KEY,
  captureAttributionFromLocation,
  mergeAttribution,
  parseAttributionFromSearch,
  sanitizeAttribution,
} from './attribution'

function memoryStorage(initial: Record<string, string> = {}) {
  const map = new Map(Object.entries(initial))
  return {
    getItem: (k: string) => map.get(k) ?? null,
    setItem: (k: string, v: string) => {
      map.set(k, v)
    },
  }
}

describe('attribution', () => {
  it('parseia utm e click ids', () => {
    const a = parseAttributionFromSearch(
      '?utm_source=google&utm_medium=cpc&gclid=G123&fbclid=F9',
      '/catalogo',
    )
    expect(a?.utm_source).toBe('google')
    expect(a?.gclid).toBe('G123')
    expect(a?.fbclid).toBe('F9')
    expect(a?.landing_path).toBe('/catalogo')
  })

  it('primeiro clique ganha no merge', () => {
    const a = mergeAttribution(
      { utm_source: 'google', gclid: 'A' },
      { utm_source: 'meta', gclid: 'B', fbclid: 'X' },
    )
    expect(a?.utm_source).toBe('google')
    expect(a?.gclid).toBe('A')
    expect(a?.fbclid).toBe('X')
  })

  it('persiste na session e ignora lixo', () => {
    const storage = memoryStorage()
    captureAttributionFromLocation(
      { search: '?utm_campaign=pecas&utm_source=google', pathname: '/' },
      storage,
    )
    const raw = storage.getItem(ATTRIBUTION_STORAGE_KEY)
    expect(raw).toContain('google')
    expect(sanitizeAttribution({ evil: 1, utm_source: ' ok ' })?.utm_source).toBe('ok')
    expect(sanitizeAttribution(null)).toBeNull()
  })
})
