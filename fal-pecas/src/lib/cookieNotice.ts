/**
 * Consent cookies / armazenamento local (prep Ads).
 * v1: aceite único "accepted".
 * v2: { essential: true, marketing: boolean } — scripts de marketing só com marketing=true + IDs.
 */

export const COOKIE_NOTICE_STORAGE_KEY = 'fal_cookie_notice_v1'
export const COOKIE_CONSENT_V2_STORAGE_KEY = 'fal_cookie_consent_v2'

export type CookieConsentV2 = {
  essential: true
  marketing: boolean
  acceptedAt: string
}

type StorageLike = Pick<Storage, 'getItem' | 'setItem'>

function defaultLocalStorage(): StorageLike | null {
  try {
    if (typeof localStorage === 'undefined') return null
    return localStorage
  } catch {
    return null
  }
}

function readV2(storage: StorageLike): CookieConsentV2 | null {
  try {
    const raw = storage.getItem(COOKIE_CONSENT_V2_STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as Partial<CookieConsentV2>
    if (parsed?.essential !== true || typeof parsed.marketing !== 'boolean') return null
    return {
      essential: true,
      marketing: parsed.marketing,
      acceptedAt:
        typeof parsed.acceptedAt === 'string' && parsed.acceptedAt
          ? parsed.acceptedAt
          : new Date().toISOString(),
    }
  } catch {
    return null
  }
}

function migrateV1IfNeeded(storage: StorageLike): CookieConsentV2 | null {
  try {
    if (storage.getItem(COOKIE_NOTICE_STORAGE_KEY) !== 'accepted') return null
    const migrated: CookieConsentV2 = {
      essential: true,
      marketing: false,
      acceptedAt: new Date().toISOString(),
    }
    storage.setItem(COOKIE_CONSENT_V2_STORAGE_KEY, JSON.stringify(migrated))
    return migrated
  } catch {
    return null
  }
}

export function getCookieConsent(
  storage: StorageLike | null = defaultLocalStorage(),
): CookieConsentV2 | null {
  if (!storage) return null
  return readV2(storage) ?? migrateV1IfNeeded(storage)
}

/** Banner pode sumir após escolha (essenciais ou marketing). */
export function hasAcceptedCookieNotice(
  storage: StorageLike | null = defaultLocalStorage(),
): boolean {
  return getCookieConsent(storage) != null
}

export function hasMarketingConsent(
  storage: StorageLike | null = defaultLocalStorage(),
): boolean {
  return getCookieConsent(storage)?.marketing === true
}

export function acceptCookieNotice(
  storage: StorageLike | null = defaultLocalStorage(),
): void {
  saveCookieConsent({ marketing: false }, storage)
}

export function saveCookieConsent(
  input: { marketing: boolean },
  storage: StorageLike | null = defaultLocalStorage(),
): CookieConsentV2 {
  const value: CookieConsentV2 = {
    essential: true,
    marketing: Boolean(input.marketing),
    acceptedAt: new Date().toISOString(),
  }
  if (!storage) return value
  try {
    storage.setItem(COOKIE_CONSENT_V2_STORAGE_KEY, JSON.stringify(value))
    storage.setItem(COOKIE_NOTICE_STORAGE_KEY, 'accepted')
  } catch {
    /* private mode / quota */
  }
  return value
}
