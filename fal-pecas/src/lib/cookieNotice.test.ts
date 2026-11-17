import { describe, expect, it } from 'vitest'
import {
  COOKIE_CONSENT_V2_STORAGE_KEY,
  COOKIE_NOTICE_STORAGE_KEY,
  acceptCookieNotice,
  getCookieConsent,
  hasAcceptedCookieNotice,
  hasMarketingConsent,
  saveCookieConsent,
} from './cookieNotice'

function memoryStorage(initial: Record<string, string> = {}) {
  const map = new Map(Object.entries(initial))
  return {
    getItem: (k: string) => map.get(k) ?? null,
    setItem: (k: string, v: string) => {
      map.set(k, v)
    },
    removeItem: (k: string) => {
      map.delete(k)
    },
  }
}

describe('cookieNotice', () => {
  it('retorna false sem aceite', () => {
    expect(hasAcceptedCookieNotice(memoryStorage())).toBe(false)
    expect(hasMarketingConsent(memoryStorage())).toBe(false)
  })

  it('persiste essenciais (marketing false) e marca v1 legado', () => {
    const storage = memoryStorage()
    acceptCookieNotice(storage)
    expect(storage.getItem(COOKIE_NOTICE_STORAGE_KEY)).toBe('accepted')
    expect(hasAcceptedCookieNotice(storage)).toBe(true)
    expect(hasMarketingConsent(storage)).toBe(false)
    const c = getCookieConsent(storage)
    expect(c?.essential).toBe(true)
    expect(c?.marketing).toBe(false)
  })

  it('aceita marketing explicitamente', () => {
    const storage = memoryStorage()
    saveCookieConsent({ marketing: true }, storage)
    expect(hasMarketingConsent(storage)).toBe(true)
    expect(JSON.parse(storage.getItem(COOKIE_CONSENT_V2_STORAGE_KEY)!).marketing).toBe(
      true,
    )
  })

  it('migra v1 accepted → v2 marketing false', () => {
    const storage = memoryStorage({ [COOKIE_NOTICE_STORAGE_KEY]: 'accepted' })
    expect(hasAcceptedCookieNotice(storage)).toBe(true)
    expect(hasMarketingConsent(storage)).toBe(false)
    expect(storage.getItem(COOKIE_CONSENT_V2_STORAGE_KEY)).toBeTruthy()
  })
})
