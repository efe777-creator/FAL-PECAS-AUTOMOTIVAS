/**
 * Stack + origem de retorno da Minha Garagem (sessionStorage).
 * Voltar: dentro da garagem usa a stack; ao sair, restaura catálogo (com filtros) ou conta.
 */

export const GARAGE_NAV_STACK_KEY = 'fal.garage.nav.stack'
export const GARAGE_NAV_RETURN_KEY = 'fal.garage.nav.returnTo'
export const GARAGE_NAV_LAST_OUTSIDE_KEY = 'fal.garage.nav.lastOutside'
export const GARAGE_NAV_INSIDE_KEY = 'fal.garage.nav.inside'
export const GARAGE_NAV_STACK_MAX = 40
export const GARAGE_HOME = '/conta/veiculos'
export const GARAGE_ACCOUNT_FALLBACK = '/conta'

type StorageLike = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>

function defaultStorage(): StorageLike | null {
  try {
    if (typeof sessionStorage === 'undefined') return null
    return sessionStorage
  } catch {
    return null
  }
}

export function isGaragePath(path: string): boolean {
  if (!path) return false
  const bare = path.split('?')[0] ?? path
  return bare === GARAGE_HOME || bare.startsWith(`${GARAGE_HOME}/`)
}

export function isGarageHomePath(path: string): boolean {
  const bare = path.split('?')[0] ?? path
  return bare === GARAGE_HOME
}

export function isGarageDetailPath(path: string): boolean {
  const bare = path.split('?')[0] ?? path
  return bare.startsWith(`${GARAGE_HOME}/`) && bare.length > GARAGE_HOME.length + 1
}

/** Pathname + search (sem hash). */
export function garageLocationKey(pathname: string, search = ''): string {
  const s = search.startsWith('?') ? search : search ? `?${search}` : ''
  return `${pathname}${s}`
}

/** Destinos internos seguros (bloqueia protocol-relative / URLs absolutas). */
export function isSafeAppPath(key: string): boolean {
  if (!key.startsWith('/')) return false
  if (key.startsWith('//')) return false
  if (/^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(key)) return false
  return true
}

export function readGarageNavStack(
  storage: StorageLike | null = defaultStorage(),
): string[] {
  if (!storage) return []
  try {
    const raw = storage.getItem(GARAGE_NAV_STACK_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as unknown
    if (!Array.isArray(parsed)) return []
    return parsed
      .filter((p): p is string => typeof p === 'string' && isGaragePath(p))
      .slice(-GARAGE_NAV_STACK_MAX)
  } catch {
    return []
  }
}

function writeStack(stack: string[], storage: StorageLike | null): void {
  if (!storage) return
  try {
    storage.setItem(
      GARAGE_NAV_STACK_KEY,
      JSON.stringify(stack.slice(-GARAGE_NAV_STACK_MAX)),
    )
  } catch {
    /* ignore quota */
  }
}

function readFlag(storage: StorageLike | null, key: string): boolean {
  if (!storage) return false
  try {
    return storage.getItem(key) === '1'
  } catch {
    return false
  }
}

function writeFlag(storage: StorageLike | null, key: string, on: boolean): void {
  if (!storage) return
  try {
    if (on) storage.setItem(key, '1')
    else storage.removeItem(key)
  } catch {
    /* ignore */
  }
}

function readString(storage: StorageLike | null, key: string): string | null {
  if (!storage) return null
  try {
    const v = storage.getItem(key)
    return v && v.length ? v : null
  } catch {
    return null
  }
}

function writeString(storage: StorageLike | null, key: string, value: string | null): void {
  if (!storage) return
  try {
    if (value == null) storage.removeItem(key)
    else storage.setItem(key, value)
  } catch {
    /* ignore */
  }
}

export function readGarageReturnTo(
  storage: StorageLike | null = defaultStorage(),
): string | null {
  const v = readString(storage, GARAGE_NAV_RETURN_KEY)
  if (!v || !isSafeAppPath(v) || isGaragePath(v)) return null
  return v
}

export function pushGarageNavLocation(
  pathname: string,
  search = '',
  storage: StorageLike | null = defaultStorage(),
): string[] {
  const key = garageLocationKey(pathname, search)
  if (!isGaragePath(key)) {
    writeStack([], storage)
    return []
  }
  const stack = readGarageNavStack(storage)
  if (stack[stack.length - 1] === key) return stack
  const next = [...stack, key].slice(-GARAGE_NAV_STACK_MAX)
  writeStack(next, storage)
  return next
}

export function popGarageNavPrevious(
  currentKey: string,
  storage: StorageLike | null = defaultStorage(),
): string | null {
  const stack = readGarageNavStack(storage)
  if (!stack.length) return null

  let next = [...stack]
  if (next[next.length - 1] === currentKey) {
    next = next.slice(0, -1)
  }
  const prev = next.length ? next[next.length - 1]! : null
  writeStack(next, storage)
  return prev && isGaragePath(prev) ? prev : null
}

/**
 * Registra navegação global:
 * - fora da garagem: guarda última URL (ex.: /catalogo?maker=…)
 * - ao entrar na garagem: congela essa URL como returnTo e inicia/continua a stack
 */
export function noteGarageNavigation(
  pathname: string,
  search = '',
  storage: StorageLike | null = defaultStorage(),
): void {
  const key = garageLocationKey(pathname, search)

  if (!isGaragePath(key)) {
    if (isSafeAppPath(key)) {
      writeString(storage, GARAGE_NAV_LAST_OUTSIDE_KEY, key)
    }
    writeFlag(storage, GARAGE_NAV_INSIDE_KEY, false)
    return
  }

  const wasInside = readFlag(storage, GARAGE_NAV_INSIDE_KEY)
  if (!wasInside) {
    const outside = readString(storage, GARAGE_NAV_LAST_OUTSIDE_KEY)
    if (outside && isSafeAppPath(outside) && !isGaragePath(outside)) {
      writeString(storage, GARAGE_NAV_RETURN_KEY, outside)
    }
    writeFlag(storage, GARAGE_NAV_INSIDE_KEY, true)
  }

  pushGarageNavLocation(pathname, search, storage)
}

/**
 * Destino do botão Voltar.
 * 1) tela anterior na stack da garagem
 * 2) ficha → home da garagem
 * 3) home → returnTo (catálogo c/ filtros, conta, etc.) ou /conta
 */
export function resolveGarageBackTarget(
  pathname: string,
  search = '',
  storage: StorageLike | null = defaultStorage(),
): string {
  const current = garageLocationKey(pathname, search)
  const prev = popGarageNavPrevious(current, storage)
  if (prev) return prev

  if (isGarageDetailPath(pathname)) return GARAGE_HOME

  const ret = readGarageReturnTo(storage)
  if (ret) return ret

  return GARAGE_ACCOUNT_FALLBACK
}

/** @deprecated use resolveGarageBackTarget */
export function garageBackFallback(pathname: string): string {
  if (isGarageDetailPath(pathname)) return GARAGE_HOME
  if (isGarageHomePath(pathname)) return GARAGE_ACCOUNT_FALLBACK
  return GARAGE_HOME
}
