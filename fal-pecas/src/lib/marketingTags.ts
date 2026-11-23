/**
 * #15-A — Loader de tags marketing (GTM / GA4 / Meta) + Google Consent Mode v2.
 * Carrega scripts só com: consent marketing + pelo menos um ID em env.
 * Host front = Hostinger only (2026-11-23). IDs vazios até go-live Ads (#15-B).
 */

import {
  getAnalyticsIds,
  hasAnalyticsIdsConfigured,
} from '@/lib/analytics'
import { hasMarketingConsent } from '@/lib/cookieNotice'

export const MARKETING_TAGS_SYNCED_EVENT = 'fal:marketing-tags-synced'

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void
    fbq?: ((...args: unknown[]) => void) & { queue?: unknown[]; loaded?: boolean }
    _fbq?: unknown
  }
}

type ScriptKind = 'gtm' | 'ga' | 'meta'

const SCRIPT_ATTR = 'data-fal-marketing'

let consentDefaultPushed = false
let loaded: Record<ScriptKind, boolean> = { gtm: false, ga: false, meta: false }

/** Testes / reset entre casos. */
export function __resetMarketingTagsStateForTests(): void {
  consentDefaultPushed = false
  loaded = { gtm: false, ga: false, meta: false }
  if (typeof document !== 'undefined') {
    document.querySelectorAll(`script[${SCRIPT_ATTR}]`).forEach((n) => {
      if (typeof (n as { remove?: () => void }).remove === 'function') {
        ;(n as { remove: () => void }).remove()
      }
    })
  }
}

export function getMarketingTagsLoadedState(): Readonly<Record<ScriptKind, boolean>> {
  return { ...loaded }
}

function ensureDataLayer(): unknown[] {
  if (typeof window === 'undefined') return []
  window.dataLayer = window.dataLayer ?? []
  return window.dataLayer
}

function ensureGtag(): (...args: unknown[]) => void {
  if (typeof window === 'undefined') {
    return () => undefined
  }
  if (typeof window.gtag === 'function') return window.gtag
  const dl = ensureDataLayer()
  window.gtag = function gtag(...args: unknown[]) {
    dl.push(args)
  }
  return window.gtag
}

/** Consent Mode default = denied (antes de qualquer tag). Idempotente. */
export function pushConsentDefaultDenied(): void {
  if (typeof window === 'undefined' || consentDefaultPushed) return
  ensureDataLayer()
  const gtag = ensureGtag()
  gtag('consent', 'default', {
    ad_storage: 'denied',
    ad_user_data: 'denied',
    ad_personalization: 'denied',
    analytics_storage: 'denied',
    wait_for_update: 500,
  })
  consentDefaultPushed = true
}

export function updateGoogleConsentMode(granted: boolean): void {
  if (typeof window === 'undefined') return
  pushConsentDefaultDenied()
  const gtag = ensureGtag()
  const state = granted ? 'granted' : 'denied'
  gtag('consent', 'update', {
    ad_storage: state,
    ad_user_data: state,
    ad_personalization: state,
    analytics_storage: state,
  })
}

function injectScript(opts: {
  kind: ScriptKind
  src: string
  async?: boolean
  id?: string
}): boolean {
  if (typeof document === 'undefined') return false
  const existing = document.querySelector(`script[${SCRIPT_ATTR}="${opts.kind}"]`)
  if (existing) {
    loaded[opts.kind] = true
    return false
  }
  const s = document.createElement('script')
  s.async = opts.async !== false
  s.src = opts.src
  s.setAttribute(SCRIPT_ATTR, opts.kind)
  if (opts.id) s.id = opts.id
  document.head.appendChild(s)
  loaded[opts.kind] = true
  return true
}

function loadGtm(gtmId: string): void {
  if (!gtmId || loaded.gtm) return
  const dl = ensureDataLayer()
  dl.push({ 'gtm.start': Date.now(), event: 'gtm.js' })
  injectScript({
    kind: 'gtm',
    src: `https://www.googletagmanager.com/gtm.js?id=${encodeURIComponent(gtmId)}`,
    id: 'fal-gtm',
  })
}

function loadGa4(measurementId: string): void {
  if (!measurementId || loaded.ga) return
  injectScript({
    kind: 'ga',
    src: `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(measurementId)}`,
    id: 'fal-ga4',
  })
  const gtag = ensureGtag()
  gtag('js', new Date())
  gtag('config', measurementId, { send_page_view: false })
}

function loadMetaPixel(pixelId: string): void {
  if (!pixelId || loaded.meta || typeof window === 'undefined') return
  if (typeof window.fbq !== 'function') {
    const n = function (...args: unknown[]) {
      // eslint-disable-next-line prefer-rest-params, @typescript-eslint/no-explicit-any
      const q = (n as any).queue
      q.push(args)
    } as Window['fbq']
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ;(n as any).queue = []
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ;(n as any).loaded = true
    window.fbq = n
    window._fbq = n
  }
  injectScript({
    kind: 'meta',
    src: 'https://connect.facebook.net/en_US/fbevents.js',
    id: 'fal-meta-pixel',
  })
  window.fbq?.('init', pixelId)
  window.fbq?.('consent', 'grant')
}

function revokeMetaConsent(): void {
  if (typeof window === 'undefined' || typeof window.fbq !== 'function') return
  try {
    window.fbq('consent', 'revoke')
  } catch {
    /* ignore */
  }
}

export type SyncMarketingTagsResult = {
  marketingConsent: boolean
  idsConfigured: boolean
  allowed: boolean
  loaded: Record<ScriptKind, boolean>
}

/**
 * Sincroniza Consent Mode + scripts com o estado atual de consent/IDs.
 * Sem consent ou sem IDs: não injeta tags; atualiza consent para denied.
 */
export function syncMarketingTags(): SyncMarketingTagsResult {
  if (typeof window === 'undefined') {
    return {
      marketingConsent: false,
      idsConfigured: false,
      allowed: false,
      loaded: { ...loaded },
    }
  }

  pushConsentDefaultDenied()

  const marketingConsent = hasMarketingConsent()
  const ids = getAnalyticsIds()
  const idsConfigured = hasAnalyticsIdsConfigured(ids)
  const allowed = marketingConsent && idsConfigured

  updateGoogleConsentMode(allowed)

  if (!allowed) {
    revokeMetaConsent()
    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent(MARKETING_TAGS_SYNCED_EVENT, {
          detail: { allowed: false },
        }),
      )
    }
    return {
      marketingConsent,
      idsConfigured,
      allowed: false,
      loaded: { ...loaded },
    }
  }

  if (ids.gtmId) loadGtm(ids.gtmId)
  // Se GTM estiver presente, GA/Meta costumam ir pelo container; ainda assim
  // carregamos GA/Meta diretos só quando não há GTM (evita duplicar).
  if (!ids.gtmId && ids.gaMeasurementId) loadGa4(ids.gaMeasurementId)
  if (!ids.gtmId && ids.metaPixelId) loadMetaPixel(ids.metaPixelId)
  // Com GTM: pixel/GA ficam a cargo do container; se só Meta sem GTM já tratado.
  if (ids.gtmId && ids.metaPixelId && !ids.gaMeasurementId) {
    /* Meta via GTM preferível — não força fbevents */
  }

  window.dispatchEvent(
    new CustomEvent(MARKETING_TAGS_SYNCED_EVENT, { detail: { allowed: true } }),
  )

  return {
    marketingConsent,
    idsConfigured,
    allowed: true,
    loaded: { ...loaded },
  }
}

/** Quantos scripts FAL marketing estão no DOM. */
export function countMarketingScriptsInDom(): number {
  if (typeof document === 'undefined') return 0
  return document.querySelectorAll(`script[${SCRIPT_ATTR}]`).length
}
