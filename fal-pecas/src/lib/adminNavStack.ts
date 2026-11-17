/**
 * Stack curto de navegação admin (sessionStorage).
 * Usado pelo Voltar global para não sair do /admin.
 */

export const ADMIN_NAV_STACK_KEY = 'fal.admin.nav.stack'
export const ADMIN_NAV_STACK_MAX = 40

type StorageLike = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>

function defaultStorage(): StorageLike | null {
  try {
    if (typeof sessionStorage === 'undefined') return null
    return sessionStorage
  } catch {
    return null
  }
}

export function isAdminPath(path: string): boolean {
  if (!path) return false
  const bare = path.split('?')[0] ?? path
  return bare === '/admin' || bare.startsWith('/admin/')
}

/** Pathname + search (sem hash). */
export function adminLocationKey(pathname: string, search = ''): string {
  const s = search.startsWith('?') ? search : search ? `?${search}` : ''
  return `${pathname}${s}`
}

export function readAdminNavStack(
  storage: StorageLike | null = defaultStorage(),
): string[] {
  if (!storage) return []
  try {
    const raw = storage.getItem(ADMIN_NAV_STACK_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as unknown
    if (!Array.isArray(parsed)) return []
    return parsed
      .filter((p): p is string => typeof p === 'string' && isAdminPath(p))
      .slice(-ADMIN_NAV_STACK_MAX)
  } catch {
    return []
  }
}

function writeStack(stack: string[], storage: StorageLike | null): void {
  if (!storage) return
  try {
    storage.setItem(ADMIN_NAV_STACK_KEY, JSON.stringify(stack.slice(-ADMIN_NAV_STACK_MAX)))
  } catch {
    /* ignore quota */
  }
}

/**
 * Registra a localização atual. Se for igual ao topo, não empurra.
 * Substitui stack se o path não for admin.
 */
export function pushAdminNavLocation(
  pathname: string,
  search = '',
  storage: StorageLike | null = defaultStorage(),
): string[] {
  const key = adminLocationKey(pathname, search)
  if (!isAdminPath(key)) {
    writeStack([], storage)
    return []
  }
  const stack = readAdminNavStack(storage)
  if (stack[stack.length - 1] === key) return stack
  const next = [...stack, key].slice(-ADMIN_NAV_STACK_MAX)
  writeStack(next, storage)
  return next
}

/**
 * Remove o topo (página atual) e devolve o destino anterior, ou null.
 */
export function popAdminNavPrevious(
  currentKey: string,
  storage: StorageLike | null = defaultStorage(),
): string | null {
  const stack = readAdminNavStack(storage)
  if (!stack.length) return null

  let next = [...stack]
  // Descarta o topo se for a página atual
  if (next[next.length - 1] === currentKey) {
    next = next.slice(0, -1)
  }
  const prev = next.length ? next[next.length - 1]! : null
  writeStack(next, storage)
  return prev && isAdminPath(prev) ? prev : null
}

/** Fallback: último crumb com `to`, senão /admin. */
export function adminBackFallback(
  crumbs: Array<{ to?: string }>,
  root = '/admin',
): string {
  for (let i = crumbs.length - 1; i >= 0; i--) {
    const to = crumbs[i]?.to
    if (to && isAdminPath(to)) return to
  }
  return root
}
