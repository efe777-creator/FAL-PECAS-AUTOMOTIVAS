/**
 * Pontes guia→guia entre hubs Adaptive (sessionStorage, one-shot no mount).
 * Ortogonal às prefs `fal-admin-workspace-v1`.
 */

export const KITS_OPEN_GUIDE_KEY = 'fal.kits.openGuideId'
export const PRODUCTS_OPEN_GUIDE_KEY = 'fal.products.openGuideId'
export const APPLICATIONS_OPEN_GUIDE_KEY = 'fal.applications.openGuideId'
export const VEHICLES_OPEN_GUIDE_KEY = 'fal.vehicles.openGuideId'

export function setGuideBridge(key: string, entityId: string): void {
  try {
    const id = entityId.trim()
    if (!id) return
    sessionStorage.setItem(key, id)
  } catch {
    /* ignore */
  }
}

/** Lê e remove a ponte (consumo único). */
export function consumeGuideBridge(key: string): string | null {
  try {
    const pending = sessionStorage.getItem(key)?.trim() || null
    if (pending) sessionStorage.removeItem(key)
    return pending
  } catch {
    return null
  }
}
