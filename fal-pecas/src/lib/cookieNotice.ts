/** Aviso de cookies / armazenamento local (AJUSTE-027) — sem analytics. */

export const COOKIE_NOTICE_STORAGE_KEY = 'fal_cookie_notice_v1'

export function hasAcceptedCookieNotice(
  storage: Pick<Storage, 'getItem'> = localStorage,
): boolean {
  try {
    return storage.getItem(COOKIE_NOTICE_STORAGE_KEY) === 'accepted'
  } catch {
    return false
  }
}

export function acceptCookieNotice(
  storage: Pick<Storage, 'setItem'> = localStorage,
): void {
  try {
    storage.setItem(COOKIE_NOTICE_STORAGE_KEY, 'accepted')
  } catch {
    /* private mode / quota — banner some só nesta sessão via state */
  }
}
