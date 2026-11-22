import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { COOKIE_CONSENT_V2_STORAGE_KEY } from './cookieNotice'
import {
  __resetMarketingTagsStateForTests,
  countMarketingScriptsInDom,
  getMarketingTagsLoadedState,
  pushConsentDefaultDenied,
  syncMarketingTags,
} from './marketingTags'

function installDom() {
  const scripts: Array<{ src: string; attrs: Record<string, string> }> = []
  const head = {
    appendChild(node: { src?: string; getAttribute?: (k: string) => string | null }) {
      scripts.push({
        src: String(node.src ?? ''),
        attrs: { 'data-fal-marketing': node.getAttribute?.('data-fal-marketing') ?? '' },
      })
      return node
    },
  }
  const doc = {
    head,
    createElement(tag: string) {
      if (tag !== 'script') throw new Error(`unexpected ${tag}`)
      const attrs: Record<string, string> = {}
      return {
        async: true,
        src: '',
        id: '',
        setAttribute(k: string, v: string) {
          attrs[k] = v
        },
        getAttribute(k: string) {
          return attrs[k] ?? null
        },
      }
    },
    querySelector(sel: string) {
      if (sel.startsWith('script[data-fal-marketing=')) {
        const kind = sel.match(/="([^"]+)"/)?.[1]
        const hit = scripts.find((s) => s.attrs['data-fal-marketing'] === kind)
        return hit ? { src: hit.src } : null
      }
      return null
    },
    querySelectorAll(sel: string) {
      if (sel.includes('data-fal-marketing')) {
        return scripts.map((s) => ({ getAttribute: (k: string) => s.attrs[k] ?? null }))
      }
      return []
    },
  }

  const store = new Map<string, string>()
  const dataLayer: unknown[] = []
  const win = {
    dataLayer,
    gtag: undefined as undefined | ((...a: unknown[]) => void),
    fbq: undefined as undefined | ((...a: unknown[]) => void),
    localStorage: {
      getItem: (k: string) => store.get(k) ?? null,
      setItem: (k: string, v: string) => {
        store.set(k, v)
      },
      removeItem: (k: string) => {
        store.delete(k)
      },
    },
    dispatchEvent: () => true,
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
  }

  vi.stubGlobal('window', win)
  vi.stubGlobal('document', doc)
  vi.stubGlobal('localStorage', win.localStorage)

  return { scripts, store, dataLayer, win }
}

describe('marketingTags #15-A', () => {
  beforeEach(() => {
    __resetMarketingTagsStateForTests()
    vi.unstubAllGlobals()
  })

  afterEach(() => {
    __resetMarketingTagsStateForTests()
    vi.unstubAllGlobals()
    vi.unstubAllEnvs()
  })

  it('sem consent e sem IDs: não injeta scripts', () => {
    const { scripts } = installDom()
    vi.stubEnv('VITE_GTM_ID', '')
    vi.stubEnv('VITE_GA_MEASUREMENT_ID', '')
    vi.stubEnv('VITE_META_PIXEL_ID', '')
    const r = syncMarketingTags()
    expect(r.allowed).toBe(false)
    expect(scripts).toHaveLength(0)
    expect(countMarketingScriptsInDom()).toBe(0)
  })

  it('com ID mas sem consent: Consent Mode denied e zero scripts', () => {
    const { scripts, dataLayer, store } = installDom()
    vi.stubEnv('VITE_GTM_ID', 'GTM-TEST1')
    store.clear()
    const r = syncMarketingTags()
    expect(r.marketingConsent).toBe(false)
    expect(r.idsConfigured).toBe(true)
    expect(r.allowed).toBe(false)
    expect(scripts).toHaveLength(0)
    const consentCalls = dataLayer.filter(
      (x) => Array.isArray(x) && x[0] === 'consent',
    ) as unknown[][]
    expect(consentCalls.some((c) => c[1] === 'default')).toBe(true)
    expect(consentCalls.some((c) => c[1] === 'update')).toBe(true)
  })

  it('consent + GTM: injeta gtm.js e marca loaded.gtm', () => {
    const { scripts, store } = installDom()
    vi.stubEnv('VITE_GTM_ID', 'GTM-TEST1')
    vi.stubEnv('VITE_GA_MEASUREMENT_ID', 'G-XXXX')
    store.set(
      COOKIE_CONSENT_V2_STORAGE_KEY,
      JSON.stringify({
        essential: true,
        marketing: true,
        acceptedAt: new Date().toISOString(),
      }),
    )
    const r = syncMarketingTags()
    expect(r.allowed).toBe(true)
    expect(scripts.some((s) => s.src.includes('gtm.js?id=GTM-TEST1'))).toBe(true)
    // Com GTM, não duplica GA direto
    expect(scripts.some((s) => s.src.includes('gtag/js'))).toBe(false)
    expect(getMarketingTagsLoadedState().gtm).toBe(true)
  })

  it('consent + só GA: injeta gtag/js', () => {
    const { scripts, store } = installDom()
    vi.stubEnv('VITE_GTM_ID', '')
    vi.stubEnv('VITE_GA_MEASUREMENT_ID', 'G-ONLY')
    store.set(
      COOKIE_CONSENT_V2_STORAGE_KEY,
      JSON.stringify({
        essential: true,
        marketing: true,
        acceptedAt: new Date().toISOString(),
      }),
    )
    syncMarketingTags()
    expect(scripts.some((s) => s.src.includes('G-ONLY'))).toBe(true)
  })

  it('pushConsentDefaultDenied é idempotente', () => {
    const { dataLayer } = installDom()
    pushConsentDefaultDenied()
    pushConsentDefaultDenied()
    const defaults = dataLayer.filter(
      (x) => Array.isArray(x) && x[0] === 'consent' && x[1] === 'default',
    )
    expect(defaults).toHaveLength(1)
  })
})
