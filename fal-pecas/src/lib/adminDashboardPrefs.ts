import { defaultPinnedPathsForRole } from '@/lib/adminDashboardShortcuts'

export const ADMIN_DASHBOARD_PREFS_KEY = 'fal-admin-dashboard-prefs-v1'

export type AdminDashboardPrefs = {
  pinned: string[]
}

type StorageLike = Pick<Storage, 'getItem' | 'setItem'>

function defaultStorage(): StorageLike | null {
  try {
    if (typeof localStorage === 'undefined') return null
    return localStorage
  } catch {
    return null
  }
}

export function sanitizePinnedPaths(
  raw: unknown,
  allowedPaths: readonly string[],
): string[] {
  const allowed = new Set(allowedPaths)
  if (!Array.isArray(raw)) return []
  const out: string[] = []
  for (const item of raw) {
    if (typeof item !== 'string') continue
    const path = item.trim()
    if (!path || !allowed.has(path) || out.includes(path)) continue
    out.push(path)
  }
  return out
}

export function readAdminDashboardPrefs(
  allowedPaths: readonly string[],
  role?: string | null,
  storage: StorageLike | null = defaultStorage(),
): AdminDashboardPrefs {
  const fallback = defaultPinnedPathsForRole(role ?? null).filter((p) =>
    allowedPaths.includes(p),
  )
  if (!storage) return { pinned: fallback }
  try {
    const raw = storage.getItem(ADMIN_DASHBOARD_PREFS_KEY)
    // Sem chave → defaults. Com chave e `pinned` array → respeita (inclusive vazio).
    if (!raw) return { pinned: fallback }
    const parsed = JSON.parse(raw) as { pinned?: unknown }
    if (!Array.isArray(parsed?.pinned)) return { pinned: fallback }
    return { pinned: sanitizePinnedPaths(parsed.pinned, allowedPaths) }
  } catch {
    return { pinned: fallback }
  }
}

export function writeAdminDashboardPrefs(
  prefs: AdminDashboardPrefs,
  allowedPaths: readonly string[],
  storage: StorageLike | null = defaultStorage(),
): AdminDashboardPrefs {
  const pinned = sanitizePinnedPaths(prefs.pinned, allowedPaths)
  const next = { pinned }
  if (!storage) return next
  try {
    storage.setItem(ADMIN_DASHBOARD_PREFS_KEY, JSON.stringify(next))
  } catch {
    /* quota / private */
  }
  return next
}

export function togglePinnedPath(
  path: string,
  current: readonly string[],
  allowedPaths: readonly string[],
): string[] {
  if (!allowedPaths.includes(path)) return [...current]
  if (current.includes(path)) return current.filter((p) => p !== path)
  return [...current, path]
}
