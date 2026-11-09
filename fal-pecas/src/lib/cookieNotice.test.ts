import { describe, expect, it } from 'vitest'
import {
  COOKIE_NOTICE_STORAGE_KEY,
  acceptCookieNotice,
  hasAcceptedCookieNotice,
} from './cookieNotice'

function memoryStorage(initial: Record<string, string> = {}) {
  const map = new Map(Object.entries(initial))
  return {
    getItem: (k: string) => map.get(k) ?? null,
    setItem: (k: string, v: string) => {
      map.set(k, v)
    },
  }
}

describe('cookieNotice', () => {
  it('retorna false sem aceite', () => {
    expect(hasAcceptedCookieNotice(memoryStorage())).toBe(false)
  })

  it('persiste aceite com chave versionada', () => {
    const storage = memoryStorage()
    acceptCookieNotice(storage)
    expect(storage.getItem(COOKIE_NOTICE_STORAGE_KEY)).toBe('accepted')
    expect(hasAcceptedCookieNotice(storage)).toBe(true)
  })
})
